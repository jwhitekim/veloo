from datetime import datetime, date, timedelta, timezone

KST = timezone(timedelta(hours=9))
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import Client
from server.app.database import get_supabase
import schemas
from dateutil import parser as dateutil_parser


def _get_user_id(request: Request, sb: Client = Depends(get_supabase)) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    result = sb.table("sessions").select("user_id").eq("token", token).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="세션이 만료됐습니다.")
    return result.data["user_id"]


def _parse_deadline(text: str) -> date | None:
    if not text or not text.strip():
        return None
    text = text.strip()
    today = datetime.now(KST).date()
    monday = today - timedelta(days=today.weekday())

    if "오늘" in text:
        return today
    if "내일" in text:
        return today + timedelta(days=1)

    weekday_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
    for kr, wd in weekday_map.items():
        if kr + "요일" in text:
            return monday + timedelta(days=wd)

    try:
        return dateutil_parser.parse(text, fuzzy=True).date()
    except Exception:
        return None


def _this_week_range() -> tuple[date, date]:
    today = datetime.now(KST).date()
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(days=6)

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("/calendar", response_model=List[schemas.TodoOut])
def get_calendar_todos(
    start: str,
    end: str,
    sb: Client = Depends(get_supabase),
    user_id: str = Depends(_get_user_id),
):
    res = (
        sb.table("todos")
        .select("*, steps(*)")
        .eq("user_id", user_id)
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time")
        .execute()
    )
    return [_sort_steps(t) for t in (res.data or [])]


def _sort_steps(todo: dict) -> dict:
    todo["steps"] = sorted(todo.get("steps") or [], key=lambda s: s["order_index"])
    return todo


def _fetch_one(sb: Client, todo_id: int) -> dict:
    res = sb.table("todos").select("*, steps(*)").eq("id", todo_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Todo not found")
    return _sort_steps(res.data)


@router.get("", response_model=List[schemas.TodoOut])
def get_todos(filter: Optional[str] = None, sb: Client = Depends(get_supabase), user_id: str = Depends(_get_user_id)):
    query = sb.table("todos").select("*, steps(*)").eq("user_id", user_id)
    
    if filter == "week":
        res = query.eq("done", False).order("created_at", desc=True).execute()
    elif filter == "memo":
        res = query.neq("memo", "").order("created_at", desc=True).execute()
    else:
        res = query.order("created_at", desc=True).execute()

    todos = [_sort_steps(t) for t in (res.data or [])]

    if filter == "week":
        monday, sunday = _this_week_range()
        todos = [
            t for t in todos
            if (d := _parse_deadline(t.get("deadline") or "")) is not None
            and monday <= d <= sunday
        ]

    if filter == "today":
        today = datetime.now(KST).date()
        todos = [
            t for t in todos
            if (d := _parse_deadline(t.get("deadline") or "")) is not None
            and d == today
        ]

    return todos


@router.get("/{todo_id}", response_model=schemas.TodoOut)
def get_todo(todo_id: int, sb: Client = Depends(get_supabase)):
    return _fetch_one(sb, todo_id)


@router.post("", response_model=schemas.TodoOut)
def create_todo(todo_in: schemas.TodoCreate, sb: Client = Depends(get_supabase), user_id: str = Depends(_get_user_id)):
    res = sb.table("todos").insert({"user_id": user_id, **todo_in.model_dump()}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Todo 생성에 실패했습니다.")
    todo = res.data[0]
    todo["steps"] = []
    return todo


@router.patch("/{todo_id}", response_model=schemas.TodoOut)
def update_todo(todo_id: int, todo_in: schemas.TodoUpdate, sb: Client = Depends(get_supabase)):
    # Explicit null values clear calendar assignments; omitted fields remain unchanged.
    data = todo_in.model_dump(exclude_unset=True)
    if "start_time" in data:
        data["reminded"] = False
        if todo_in.start_time is None:
            data["remind_at"] = None
        elif "remind_at" not in data:
            st = todo_in.start_time
            if st.tzinfo is None:
                st = st.replace(tzinfo=KST)
            data["remind_at"] = (st - timedelta(minutes=30)).isoformat()

    for key, value in list(data.items()):
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=KST)
            data[key] = value.isoformat()

    sb.table("todos").update(data).eq("id", todo_id).execute()

    return _fetch_one(sb, todo_id)


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, sb: Client = Depends(get_supabase)):
    sb.table("todos").delete().eq("id", todo_id).execute()
    return {"ok": True}


@router.patch("/{todo_id}/done", response_model=schemas.TodoOut)
def toggle_done(todo_id: int, sb: Client = Depends(get_supabase)):
    current = sb.table("todos").select("done").eq("id", todo_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Todo not found")
    sb.table("todos").update({"done": not current.data["done"]}).eq("id", todo_id).execute()
    return _fetch_one(sb, todo_id)


@router.post("/{todo_id}/steps", response_model=schemas.StepOut)
def add_step(todo_id: int, step_in: schemas.StepCreate, sb: Client = Depends(get_supabase)):
    res = sb.table("steps").insert({"todo_id": todo_id, **step_in.model_dump()}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Step 생성에 실패했습니다.")
    return res.data[0]
