import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from supabase import Client
from server.app.database import get_supabase
from server.app.ai_provider import get_ai_provider, extract_json, JSON_OUTPUT_CONTRACT
import schemas

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ── Context Layer 1 + 2: Role & Rules
_STEPS_SYSTEM = f"""\
<role>
AI/ML 연구실 업무를 실행 가능한 단계로 나누는 연구 작업 플래너.
</role>

<task>
입력된 TODO를 실제 연구 흐름 기준으로
논리적인 작업 단계(step)로 분해한다.
</task>

<constraints>
- MEMO에 등장하는 구체적인 대상(파일명, 도구, 데이터셋, 모듈명, 논문명 등)을 최소 하나 이상 step 문구에 직접 반영할 것
- MEMO가 비어있지 않다면, 그 내용과 무관하게 어떤 TODO에도 붙을 법한 뻔한 단계(예: "자료 조사", "계획 수립", "결과 정리")만 나열하지 말 것
- 동일한 의미의 step을 중복 생성하지 말 것
- 개념 설명이 아니라 실제 수행 작업 단위로 작성
- abstraction level을 일관되게 유지
- 개념 설명과 실행 작업을 섞지 말 것
- TODO를 "완료 가능한 workflow" 기준으로만 분해할 것
- 정확히 3~4개의 step만 출력할 것 (5개 이상 금지). 그 이상 떠오르더라도 성격이 겹치는 step은 하나로 합칠 것
- 출력하기 전에 step 개수를 스스로 세어 4개를 넘으면 병합해서 줄일 것
- 새로운 아이디어를 계속 추가하지 말 것
</constraints>

<style>
- 한국어
- concise
- actionable
- 연구실 작업 스타일 유지
</style>

{JSON_OUTPUT_CONTRACT}

<schema>
{{
  "steps": ["실행 가능한 작업 단위 문장", "..."]
}}
</schema>
"""

_STRATEGY_SYSTEM = """\
<role>
AI/ML 연구실 일정 우선순위를 조언하는 연구 스케줄 보조자.
</role>

<task>
현재 TODO의 priority와 deadline을 고려하여,
언제 시작하면 좋은지 한 문장으로 조언한다.
</task>

<constraints>
- 한 문장만 출력
- 다른 작업과의 우선순위 관계 언급
- 시작 시점 또는 시간대 제안 포함
- 추상 조언 금지
- 현실적인 일정 감각 유지
</constraints>

<style>
- 한국어
- friendly
- concise
- concrete
</style>

<output_contract>
한 문장 텍스트만 출력.
</output_contract>
"""

# ── Context Layer 3: Few-shot
_STEPS_EXAMPLES = """\
EXAMPLE_1:
  input:  TODO="Transformer 논문 리뷰" / MEMO="Attention Is All You Need, 랩미팅 발표용, self-attention 수식 파트 위주로" / PRIORITY=mid / DEADLINE=2일
  output: {"steps": [
    "Attention Is All You Need에서 self-attention 수식(Q/K/V, scaled dot-product) 파트 정독",
    "self-attention 수식을 랩미팅 발표 슬라이드용 다이어그램으로 정리",
    "관련 후속 연구와 비교해 비판 포인트 정리",
    "랩미팅 발표 스크립트 작성"
  ]}

EXAMPLE_2:
  input:  TODO="실험 코드 디버깅" / MEMO="train.py에서 loss가 NaN 뜸, mixed precision 켠 뒤부터" / PRIORITY=urgent / DEADLINE=오늘
  output: {"steps": [
    "train.py에서 mixed precision 활성화 이후 NaN 발생 지점 로그로 특정",
    "해당 지점의 gradient/scale 값 확인해 원인 파악 및 수정",
    "mixed precision 켠 상태로 재실행해 NaN 재발 여부 확인"
  ]}"""



@router.post("/generate-steps")
def generate_steps(req: schemas.GenerateStepsRequest):
    provider = get_ai_provider()
    raw = provider.complete(
        system=f"{_STEPS_SYSTEM}\n\n{_STEPS_EXAMPLES}",
        user=(
            f"TODO: {req.todo_name}\n"
            f"MEMO: {req.memo or '없음'}\n"
            f"PRIORITY: {req.priority}\n"
            f"DEADLINE: {req.deadline or '미정'}"
        ),
        max_tokens=512,
    )
    try:
        return extract_json(raw)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {e}")


def _write_steps_to_db(todo_id: int, steps: list[str], sb: Client) -> None:
    for i, step in enumerate(steps):
        sb.table("steps").insert({
            "todo_id": todo_id,
            "text":    step,
            "order_index": i,
            "done":    False,
        }).execute()


def _run_generate_steps(req: schemas.GenerateStepsRequest) -> None:
    sb = get_supabase()
    try:
        provider = get_ai_provider()
        raw = provider.complete(
            system=f"{_STEPS_SYSTEM}\n\n{_STEPS_EXAMPLES}",
            user=(
                f"TODO: {req.todo_name}\n"
                f"MEMO: {req.memo or '없음'}\n"
                f"PRIORITY: {req.priority}\n"
                f"DEADLINE: {req.deadline or '미정'}"
            ),
            max_tokens=512,
        )
        steps = extract_json(raw).get("steps", [])
        _write_steps_to_db(req.todo_id, steps, sb)
    except Exception:
        logging.exception("Background step generation failed for todo_id=%s", req.todo_id)


@router.post("/generate-steps-async")
def generate_steps_async(
    req: schemas.GenerateStepsRequest,
    background_tasks: BackgroundTasks,
):
    if req.todo_id is None:
        raise HTTPException(status_code=422, detail="todo_id required for async generation")
    background_tasks.add_task(_run_generate_steps, req)
    return {"status": "generating"}


# 2026-09-01: 프론트엔드의 AI 전략 UI(FocusPanel "AI 전략" 섹션, TodoList 인사이트 카드)를
# 제거하면서 이 엔드포인트는 현재 프론트엔드 호출자가 없다. 되살리기 쉽도록 의도적으로 남겨둠 —
# 삭제 대상 아님.
@router.post("/generate-strategy")
def generate_strategy(req: schemas.GenerateStrategyRequest, sb: Client = Depends(get_supabase)):
    provider = get_ai_provider()

    res = sb.table("todos").select("name").eq("id", req.todo_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Todo not found")
    target_name = res.data["name"]

    # 클라이언트 제공 데이터 대신 DB에서 직접 조회
    all_todos = sb.table("todos").select("name, priority, deadline, done").eq("done", False).execute()
    todos_text = "\n".join(
        f"- [{t['priority']}] {t['name']} (마감: {t.get('deadline') or '미정'})"
        for t in (all_todos.data or [])
    )

    strategy = provider.complete(
        system=_STRATEGY_SYSTEM,
        user=(
            f"ALL_TODOS:\n{todos_text}\n\n"
            f"TARGET: {target_name}"
        ),
        max_tokens=256,
    )

    sb.table("todos").update({"ai_strategy": strategy}).eq("id", req.todo_id).execute()

    updated = sb.table("todos").select("*, steps(*)").eq("id", req.todo_id).single().execute()
    todo = updated.data
    todo["steps"] = sorted(todo.get("steps") or [], key=lambda s: s["order_index"])
    return todo
