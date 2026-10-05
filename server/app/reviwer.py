"""논문 아키텍처 설명력 훈련 앱 — FastAPI 백엔드"""
import asyncio
import json
import logging
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.app.ai_provider import get_ai_provider

load_dotenv(Path(__file__).parent.parent.parent / ".env")

app = FastAPI(title="Model Review")

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

from server.app.database import get_supabase
_supabase = get_supabase()

EXPLAIN_PROMPT = """\
<role>
당신은 ML/DL/CV/NLP 논문 아키텍처 그림을 분석하는 연구 보조자입니다.
그림에 보이는 모듈, 화살표, 입력·출력, 학습/추론 흐름을 근거로 기술적으로 설명합니다.
</role>

<output_contract>
반드시 JSON만 출력합니다.
마크다운, 코드펜스, 추가 설명을 출력하지 않습니다.
</output_contract>

<schema>
{
  "overview": "...",
  "modules": [
    {
      "name": "...",
      "role": "...",
      "operation": "..."
    }
  ],
  "data_flow": [
    {
      "step": 1,
      "description": "..."
    }
  ],
  "contribution": "...",
  "uncertain_parts": [
    "그림만으로 확정하기 어려운 부분"
  ]
}
</schema>

<constraints>
- 그림에 보이는 정보에 근거해 설명합니다.
- 보이지 않는 세부 구현을 단정하지 않습니다.
- 모듈명은 그림에 적힌 원문 표현을 가능한 보존합니다.
- data_flow는 입력에서 출력까지 순서대로 작성합니다.
- uncertain_parts가 없으면 빈 배열로 둡니다.
</constraints>
"""

FEEDBACK_PROMPT = """\
<role>
당신은 사용자의 논문 아키텍처 설명을 채점하고 교정하는 연구 멘토입니다.
사용자 설명과 기준 분석을 비교하여 맞은 점, 빠진 점, 오해한 점을 구분합니다.
</role>

<input>
<user_explanation>
{user_explanation}
</user_explanation>

<reference_analysis>
{ai_explanation}
</reference_analysis>
</input>

<output_contract>
반드시 JSON만 출력합니다.
마크다운, 코드펜스, 추가 설명을 출력하지 않습니다.
</output_contract>

<schema>
{{
  "correct": [
    "사용자가 정확히 이해한 내용"
  ],
  "missing": [
    "사용자가 빠뜨린 핵심 내용"
  ],
  "incorrect": [
    "사용자가 잘못 이해한 내용"
  ],
  "suggestion": "사용자 설명을 더 정확하게 고친 문장"
}}
</schema>

<constraints>
- user_explanation에 없는 내용을 correct에 넣지 않습니다.
- reference_analysis에 근거해 비교합니다.
- 틀린 부분과 빠진 부분을 구분합니다.
- suggestion은 사용자가 그대로 참고할 수 있는 자연스러운 한국어 설명으로 작성합니다.
</constraints>
"""


def _parse_json(text: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", text).strip()
    return json.loads(cleaned)


class FeedbackRequest(BaseModel):
    ai_explanation: dict
    user_explanation: str
    history_id: int | None = None


@app.post("/api/explain")
async def explain(request: Request, image: UploadFile = File(...)):
    user_id = request.state.user_id
    media_type = image.content_type or "image/png"
    if media_type not in _ALLOWED_IMAGE_TYPES:
        return JSONResponse({"error": "지원하지 않는 이미지 형식입니다. (jpeg/png/gif/webp만 허용)"}, status_code=400)

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        return JSONResponse({"error": "이미지가 너무 큽니다 (최대 10MB)"}, status_code=400)

    try:
        provider = get_ai_provider()
        response_text = await asyncio.to_thread(
            provider.complete,
            system="",
            user=EXPLAIN_PROMPT,
            max_tokens=2000,
            tier="smart",
            images=[(media_type, image_bytes)],
        )
        explanation_json = _parse_json(response_text)
    except Exception:
        logging.exception("arch_trainer error")
        return JSONResponse({"error": "서버 오류가 발생했습니다."}, status_code=500)

    history_id = None
    if _supabase:
        try:
            res = await asyncio.to_thread(
                lambda: _supabase.table("arch_history").insert({
                    "user_id": user_id,
                    "image_name": image.filename,
                    "explanation": explanation_json,
                }).execute()
            )
            if res.data:
                history_id = res.data[0]["id"]
        except Exception:
            logging.exception("arch history save error")

    return JSONResponse({"explanation": explanation_json, "history_id": history_id})


@app.post("/api/feedback")
async def feedback(req: FeedbackRequest, request: Request):
    user_id = request.state.user_id
    try:
        provider = get_ai_provider()
        response_text = await asyncio.to_thread(
            provider.complete,
            system="",
            user=FEEDBACK_PROMPT.format(
                user_explanation=req.user_explanation.replace("<", "&lt;").replace(">", "&gt;"),
                ai_explanation=json.dumps(req.ai_explanation, ensure_ascii=False, indent=2),
            ),
            max_tokens=2000,
            tier="smart",
        )
        feedback_json = _parse_json(response_text)
    except Exception:
        logging.exception("arch_trainer error")
        return JSONResponse({"error": "서버 오류가 발생했습니다."}, status_code=500)

    if _supabase and req.history_id:
        try:
            await asyncio.to_thread(
                lambda: _supabase.table("arch_history")
                    .update({"feedback": feedback_json})
                    .eq("id", req.history_id)
                    .eq("user_id", user_id)
                    .execute()
            )
        except Exception:
            pass

    return JSONResponse({"feedback": feedback_json})


@app.get("/api/history")
async def get_arch_history(request: Request, count: bool = False):
    if not _supabase:
        return JSONResponse({"count": 0} if count else {"items": []})
    user_id = request.state.user_id
    try:
        if count:
            res = await asyncio.to_thread(
                lambda: _supabase.table("arch_history").select("id", count="exact").eq("user_id", user_id).execute()
            )
            return JSONResponse({"count": res.count or 0})
        res = await asyncio.to_thread(
            lambda: _supabase.table("arch_history")
                .select("id,image_name,explanation,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(5)
                .execute()
        )
        return JSONResponse({"items": res.data})
    except Exception:
        return JSONResponse({"count": 0} if count else {"items": []})
