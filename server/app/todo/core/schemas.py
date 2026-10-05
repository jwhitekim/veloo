from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class StepBase(BaseModel):
    text: str
    done: bool = False
    order_index: int = 0


class StepCreate(StepBase):
    pass


class StepUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    order_index: Optional[int] = None


class StepOut(StepBase):
    id: int
    todo_id: int

    model_config = {"from_attributes": True}


class TodoBase(BaseModel):
    name: str
    memo: str = ""
    priority: str = "normal"
    deadline: str = ""


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    name: Optional[str] = None
    memo: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    done: Optional[bool] = None
    # POST /api/ai/generate-strategy가 채우는 필드 — 프론트엔드 AI 전략 UI 제거(2026-09-01)
    # 이후 호출자는 없지만, 엔드포인트를 되살리기 쉽도록 의도적으로 남겨둠.
    ai_strategy: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remind_at: Optional[datetime] = None


class TodoOut(TodoBase):
    id: int
    done: bool
    ai_strategy: str  # 프론트엔드 미사용 — TodoUpdate.ai_strategy 주석 참고
    created_at: datetime
    updated_at: datetime
    steps: List[StepOut] = []
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remind_at: Optional[datetime] = None
    reminded: bool = False
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GenerateStepsRequest(BaseModel):
    todo_id: int | None = None
    todo_name: str = Field(..., max_length=200)
    memo: str = Field("", max_length=1000)
    priority: Literal["urgent", "mid", "normal"] = "normal"
    deadline: str = Field("", max_length=100)


class GenerateStrategyRequest(BaseModel):
    todo_id: int
