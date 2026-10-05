"""Contextor — 단어를 ML/DL 맥락별로 펼쳐 설명 (구조화 JSON 응답)"""
import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pathlib import Path
from pydantic import BaseModel

from server.app.ai_provider import get_ai_provider

load_dotenv(Path(__file__).parent.parent.parent / ".env")

app = FastAPI(title="Contextor")

_supabase_url = os.environ.get("SUPABASE_URL")
_supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
_supabase = None
if _supabase_url and _supabase_key:
    from supabase import create_client
    _supabase = create_client(_supabase_url, _supabase_key)

# Context Layer 1: Role & Domain
_SYSTEM_PROMPT = """\
<role>
당신은 머신러닝 분야 박사과정 연구자입니다.
영어 단어나 짧은 구를 받으면, 그것이 ML/DL 논문에서 어떤 맥락으로
쓰이는지 케이스별로 펼쳐 설명합니다.

독자는 논문을 읽다가 해당 용어를 만난 한국인 대학원생이며,
자신의 문맥에 맞는 의미를 직접 선택하려 합니다.
</role>
"""

# Context Layer 2: Constraint Rules + JSON schema
_RULES = """\
<output_contract>
반드시 JSON만 출력합니다.
다른 텍스트·설명·마크다운·코드펜스 출력 금지.
</output_contract>

<schema>
{
  "query": "<입력 단어 그대로>",
  "hasMlUsage": <true | false>,
  "cases": [
    {
      "label": "<맥락 라벨>",
      "term": "<영어 용어>",
      "meaning": "<한국어 의미 설명>",
      "exampleEn": "<영어 예문>",
      "exampleKo": "<한국어 번역>"
    }
  ],
  "note": "<특수 용법이 없을 때만 사용>"
}
</schema>

<constraints>
- cases는 최대 5개
- 실제 ML/DL 논문에서 쓰이는 의미만 포함
- 억지 ML 의미 생성 금지
- 서로 의미가 중복되는 cases 생성 금지
- 단정하지 말고 가능한 맥락을 나열
- 정착 번역어가 있으면 우선 사용
</constraints>
"""

# Context Layer 3: Few-shot examples
_EXAMPLES = """\
<examples>
EXAMPLE_1:
INPUT: trials
OUTPUT:
{"query":"trials","hasMlUsage":true,"cases":[{"label":"실험 시행","term":"trials","meaning":"하이퍼파라미터 탐색이나 반복 실험에서 1회 실행 단위를 의미함.","exampleEn":"We ran 100 trials with different random seeds.","exampleKo":"서로 다른 랜덤 시드로 100회 실험을 수행했다."},{"label":"강화학습 에피소드","term":"trials","meaning":"RL에서 에이전트가 환경과 상호작용하는 1회 시도.","exampleEn":"The agent improves over successive trials.","exampleKo":"에이전트는 반복된 시도를 거치며 개선된다."},{"label":"통계적 시행","term":"Bernoulli trials","meaning":"확률 실험에서의 독립 시행.","exampleEn":"n independent Bernoulli trials","exampleKo":"n번의 독립적인 베르누이 시행"}],"note":""}

EXAMPLE_2:
INPUT: interleave
OUTPUT:
{"query":"interleave","hasMlUsage":true,"cases":[{"label":"교차 배치","term":"interleave","meaning":"서로 다른 종류의 레이어나 연산을 번갈아 배치하는 방식.","exampleEn":"We interleave attention and convolution layers.","exampleKo":"어텐션 레이어와 컨볼루션 레이어를 교차 배치한다."},{"label":"인터리빙(데이터)","term":"interleaving","meaning":"여러 데이터 스트림이나 태스크의 샘플을 번갈아 섞어 학습에 사용하는 기법.","exampleEn":"Training data from multiple tasks is interleaved.","exampleKo":"여러 태스크의 학습 데이터를 인터리빙하여 사용한다."}],"note":""}

EXAMPLE_3:
INPUT: banana
OUTPUT:
{"query":"banana","hasMlUsage":false,"cases":[],"note":"ML 특수 용법 없음. 일반적 의미(과일)로 사용됩니다."}
</examples>
"""


class LookupRequest(BaseModel):
    text: str


def _extract_json(raw: str) -> dict:
    """Claude 응답에서 JSON만 안전하게 파싱."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1] if "```" in raw[3:] else raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no json object found")
    return json.loads(raw[start:end + 1])


@app.post("/api/lookup")
async def lookup(req: LookupRequest, request: Request):
    text = req.text.strip()
    user_id = request.state.user_id
    if not text:
        return JSONResponse({"error": "단어가 비어 있습니다."}, status_code=400)

    # 캐시 확인
    if _supabase:
        try:
            cached = await asyncio.to_thread(
                lambda: _supabase.table("contextor_history")
                    .select("result")
                    .eq("user_id", user_id)
                    .eq("query", text)
                    .limit(1)
                    .execute()
            )
            if cached.data:
                return JSONResponse(cached.data[0]["result"])
        except Exception:
            pass

    try:
        provider = get_ai_provider()
        raw = await asyncio.to_thread(
            provider.complete,
            system=f"{_SYSTEM_PROMPT}\n\n{_RULES}",
            user=f"{_EXAMPLES}\n\nINPUT: {text}\nOUTPUT:",
            max_tokens=900,
        )
        result = _extract_json(raw)
    except Exception:
        logging.exception("contextor lookup error")
        return JSONResponse(
            {"error": "조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."},
            status_code=502,
        )

    # 캐시 저장
    if _supabase:
        try:
            await asyncio.to_thread(
                lambda: _supabase.table("contextor_history").insert({
                    "user_id": user_id,
                    "query": text,
                    "result": result,
                }).execute()
            )
        except Exception:
            logging.exception("contextor history save error")

    return JSONResponse(result)


@app.get("/api/history")
async def get_history(request: Request, count: bool = False):
    if not _supabase:
        return JSONResponse({"count": 0} if count else {"items": []})
    user_id = request.state.user_id
    try:
        if count:
            res = await asyncio.to_thread(
                lambda: _supabase.table("contextor_history").select("id", count="exact").eq("user_id", user_id).execute()
            )
            return JSONResponse({"count": res.count or 0})
        res = await asyncio.to_thread(
            lambda: _supabase.table("contextor_history")
                .select("id,query,result,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
        )
        return JSONResponse({"items": res.data})
    except Exception:
        return JSONResponse({"count": 0} if count else {"items": []})
