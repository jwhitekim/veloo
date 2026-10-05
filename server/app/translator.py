"""Translation Studio — FastAPI + Claude API"""
import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
from pydantic import BaseModel

from server.app.ai_provider import get_ai_provider

load_dotenv(Path(__file__).parent.parent.parent / ".env")

app = FastAPI(title="Translation Studio")

from server.app.database import get_supabase
_supabase = get_supabase()

_SYSTEM = """\
<role>
ML/DL/CV/NLP 논문 번역기.
영어 단어·문장·문단을 자연스러운 한국어로 번역한다.
</role>

<rules>
단어 또는 3어 이하의 짧은 구:
- 목적은 용어의 의미 전달이다.
- 기본 출력 형식은 한국어 의미 + 원어 병기이다.
- 다만 한국어 번역이 부자연스럽거나 실제 사용 빈도가 낮은 경우 영어를 유지할 수 있다.

원문 보존:
- 수식·변수·기호 보존: ∇L, θ, x_i, R^d 등
- 고유명사 보존: 모델명, 데이터셋명, 인용 키(BERT, ImageNet, [12] 등)
- 코드 식별자 보존: 함수명, 클래스명 등
- 원문의 문단·줄바꿈 구조 유지
- 원문에 없는 내용 추가 금지, 누락 금지

용어 처리 (문장·문단에 한함):
- 문장 흐름 안에서 다음 용어는 영어 유지:
  fine-tuning, transformer, encoder, decoder, token, layer,
  weight, bias, gradient, loss, batch, epoch, inference,
  prompt, dropout, downstream
- 정착 용어는 한국어(영어) 병기: 어텐션(attention), 임베딩(embedding)

문체:
- 자연스러운 한국어 학술 문체로 번역
- 영어식 어순 직역 금지
- 영어식 수동태 직역 금지
- 불필요한 "우리는 ~" 사용 금지
- "We propose ..."는 "본 논문에서는 ~를 제안함"으로 처리
- 명사형 종결 선호: ~함, ~됨, ~임
</rules>

<examples>
입력: transformer
출력: 트랜스포머(transformer)

입력: gradient
출력: 기울기(gradient)

입력: We fine-tune the encoder on downstream tasks.
출력: 본 논문에서는 downstream 작업에 대해 encoder를 fine-tuning함.

입력: Table 2 reports the loss on the validation set.
출력: 표 2는 검증 세트에서의 loss를 보고함.
</examples>

<output>
번역문만. 설명·접두어·따옴표 없이.
</output>"""


class TranslateRequest(BaseModel):
    text: str


@app.post("/api/translate")
async def translate(req: TranslateRequest, request: Request):
    text = req.text.strip()
    user_id = request.state.user_id
    if not text:
        return JSONResponse({"error": "텍스트가 비어 있습니다."}, status_code=400)

    # Cache check
    if _supabase:
        try:
            cached_res = await asyncio.to_thread(
                lambda: _supabase.table("translation_history")
                    .select("translated_text")
                    .eq("user_id", user_id)
                    .eq("source_text", text)
                    .limit(1)
                    .execute()
            )
            if cached_res.data:
                cached_text = cached_res.data[0]["translated_text"]

                async def cached_stream():
                    yield cached_text

                return StreamingResponse(
                    cached_stream(),
                    media_type="text/plain; charset=utf-8",
                    headers={"X-Cache": "HIT"},
                )
        except Exception:
            pass

    collected: list[str] = []

    async def stream():
        provider = get_ai_provider()
        try:
            async for chunk in provider.stream(system=_SYSTEM, user=text, max_tokens=4096, tier="smart"):
                collected.append(chunk)
                yield chunk
        except asyncio.CancelledError:
            raise
        except Exception:
            logging.exception("translate stream error")
            if not collected:
                yield "번역 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            return

        if _supabase:
            try:
                full_text = "".join(collected)
                type_value = "word" if len(text.split()) == 1 else "sentence"
                await asyncio.to_thread(
                    lambda: _supabase.table("translation_history").insert({
                        "user_id": user_id,
                        "source_text": text,
                        "translated_text": full_text,
                        "type": type_value,
                    }).execute()
                )
            except Exception:
                logging.exception("translation history save error")

    return StreamingResponse(stream(), media_type="text/plain; charset=utf-8")


@app.get("/api/history")
async def get_translation_history(request: Request, count: bool = False):
    if not _supabase:
        return JSONResponse({"count": 0} if count else {"items": []})
    user_id = request.state.user_id
    try:
        if count:
            res = await asyncio.to_thread(
                lambda: _supabase.table("translation_history")
                    .select("id", count="exact")
                    .eq("user_id", user_id)
                    .execute()
            )
            return JSONResponse({"count": res.count or 0})
        res = await asyncio.to_thread(
            lambda: _supabase.table("translation_history")
                .select("id,source_text,translated_text,type,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
        )
        return JSONResponse({"items": res.data})
    except Exception:
        return JSONResponse({"count": 0} if count else {"items": []})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
