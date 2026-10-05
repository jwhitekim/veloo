import asyncio
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from server.app.database import get_supabase
_supabase = get_supabase()

from core.semantic_scholar import (
    parse_url, fetch_paper_by_url,
    fetch_paper_by_id, search_papers_by_title, enrich_authors,
)
from core.claude_analyzer import analyze_paper
from core.journal_quality import lookup_venue

app = FastAPI(title="Paper Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _check_paper_cache(paper_id: str, user_id: str) -> dict | None:
    if not _supabase or not paper_id:
        return None
    try:
        res = _supabase.table("paper_history").select("result").eq("paper_id", paper_id).eq("user_id", user_id).limit(1).execute()
        if res.data:
            return res.data[0]["result"]
    except Exception:
        pass
    return None


def _save_paper_history(user_id: str, query: str | None, paper_id: str | None, title: str, result: dict) -> None:
    if not _supabase:
        return
    try:
        _supabase.table("paper_history").insert({
            "user_id": user_id,
            "query": query,
            "paper_id": paper_id,
            "title": title,
            "result": result,
        }).execute()
    except Exception:
        logging.exception("paper history save error")


@app.get("/history")
async def get_history(request: Request, count: bool = False):
    if not _supabase:
        return JSONResponse({"count": 0} if count else {"items": []})
    user_id = request.state.user_id
    try:
        if count:
            res = await asyncio.to_thread(
                lambda: _supabase.table("paper_history").select("id", count="exact").eq("user_id", user_id).execute()
            )
            return JSONResponse({"count": res.count or 0})
        res = await asyncio.to_thread(
            lambda: _supabase.table("paper_history")
                .select("id,title,paper_id,query,created_at,result")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
        )
        return JSONResponse({"items": res.data})
    except Exception:
        return JSONResponse({"count": 0} if count else {"items": []})


@app.post("/search")
async def search(query: str = Form(...)):
    try:
        query = query.strip()

        if query.startswith("http"):
            lookup_type, _ = parse_url(query)
            if lookup_type == "unknown":
                return JSONResponse({"type": "unsupported_url"})
            return JSONResponse({"type": "url", "query": query})

        results = await asyncio.to_thread(search_papers_by_title, query, 5)
        candidates = [
            {
                "paperId": p.get("paperId"),
                "title": p.get("title"),
                "year": p.get("year"),
                "venue": p.get("venue"),
                "citationCount": p.get("citationCount"),
            }
            for p in results
        ]
        return JSONResponse({"type": "candidates", "data": candidates})
    except (PermissionError, ConnectionError) as e:
        logging.warning("search external error: %s", e)
        return JSONResponse({"error": str(e)}, status_code=502)
    except Exception:
        logging.exception("search error")
        return JSONResponse({"error": "서버 오류가 발생했습니다."}, status_code=500)


@app.post("/analyze")
async def analyze(request: Request, paper_id: str = Form(None), url: str = Form(None)):
    try:
        user_id = request.state.user_id
        paper = None
        resolved_paper_id = paper_id

        if paper_id:
            cached = await asyncio.to_thread(_check_paper_cache, paper_id, user_id)
            if cached:
                return JSONResponse({**cached, "from_cache": True})
            paper = await asyncio.to_thread(fetch_paper_by_id, paper_id)
        elif url:
            paper = await asyncio.to_thread(fetch_paper_by_url, url)
            if paper:
                resolved_paper_id = paper.get("paperId")
                if resolved_paper_id:
                    cached = await asyncio.to_thread(_check_paper_cache, resolved_paper_id, user_id)
                    if cached:
                        return JSONResponse({**cached, "from_cache": True})
        else:
            return JSONResponse({"error": "paper_id 또는 url이 필요합니다."})

        if not paper:
            return JSONResponse({"error": "논문을 찾을 수 없습니다."})

        if not resolved_paper_id:
            resolved_paper_id = paper.get("paperId")

        external_ids = paper.get("externalIds") or {}
        basic = {
            "title": paper.get("title", ""),
            "year": paper.get("year"),
            "venue": paper.get("venue", ""),
            "doi": external_ids.get("DOI"),
            "arxivId": external_ids.get("ArXiv"),
            "citationCount": paper.get("citationCount"),
        }

        abstract = paper.get("abstract") or ""
        analysis = await asyncio.to_thread(analyze_paper, abstract, basic["title"], basic["doi"] or "")
        authors = await asyncio.to_thread(enrich_authors, paper)
        quality = lookup_venue(basic["venue"])

        result = {"basic": basic, "analysis": analysis, "authors": authors, "quality": quality}

        await asyncio.to_thread(_save_paper_history, user_id, url or paper_id, resolved_paper_id, basic["title"], result)

        return JSONResponse(result)

    except Exception:
        logging.exception("analyze error")
        return JSONResponse({"error": "서버 오류가 발생했습니다."}, status_code=500)


@app.post("/analyze-pdf")
async def analyze_pdf(request: Request, file: UploadFile = File(...)):
    try:
        user_id = request.state.user_id
        from core.pdf_extractor import extract_from_pdf

        if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
            return JSONResponse({"error": "PDF 파일만 지원합니다."}, status_code=400)

        pdf_bytes = await file.read()
        if len(pdf_bytes) > 50 * 1024 * 1024:
            return JSONResponse({"error": "파일이 너무 큽니다 (최대 50MB)."}, status_code=400)
        extracted = extract_from_pdf(pdf_bytes)

        title    = extracted.get("title", "")
        abstract = extracted.get("abstract", "")
        doi      = extracted.get("doi") or ""
        arxiv_id = extracted.get("arxivId")
        figures  = extracted.get("figures", [])

        paper = None
        venue = ""
        year = None
        citation_count = None
        authors = []
        resolved_paper_id = None

        if arxiv_id:
            try:
                paper = await asyncio.to_thread(fetch_paper_by_url, f"https://arxiv.org/abs/{arxiv_id}")
            except Exception:
                pass
        if not paper and doi:
            try:
                paper = await asyncio.to_thread(fetch_paper_by_url, f"https://doi.org/{doi}")
            except Exception:
                pass

        if paper:
            ext = paper.get("externalIds") or {}
            title         = paper.get("title") or title
            abstract      = paper.get("abstract") or abstract
            doi           = ext.get("DOI") or doi
            arxiv_id      = ext.get("ArXiv") or arxiv_id
            venue         = paper.get("venue", "")
            year          = paper.get("year")
            citation_count = paper.get("citationCount")
            authors       = await asyncio.to_thread(enrich_authors, paper)
            resolved_paper_id = paper.get("paperId")

        basic = {
            "title": title,
            "year": year,
            "venue": venue,
            "doi": doi or None,
            "arxivId": arxiv_id,
            "citationCount": citation_count,
        }

        analysis = await asyncio.to_thread(analyze_paper, abstract, title, doi)
        quality  = lookup_venue(venue)

        result = {"basic": basic, "analysis": analysis, "authors": authors, "quality": quality}

        await asyncio.to_thread(_save_paper_history, user_id, None, resolved_paper_id, title, result)

        return JSONResponse({**result, "figures": figures})

    except Exception:
        logging.exception("analyze-pdf error")
        return JSONResponse({"error": "서버 오류가 발생했습니다."}, status_code=500)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
