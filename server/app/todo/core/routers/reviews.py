"""주간 리뷰 엔드포인트"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from supabase import Client
from server.app.database import get_supabase

KST = timezone(timedelta(hours=9))
router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _get_user_id(request: Request, sb: Client = Depends(get_supabase)) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    result = sb.table("sessions").select("user_id").eq("token", token).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="세션이 만료됐습니다.")
    return result.data["user_id"]


@router.get("/weekly")
def weekly_review(
    week_start: str,
    sb: Client = Depends(get_supabase),
    user_id: str = Depends(_get_user_id),
):
    try:
        ws = datetime.fromisoformat(week_start.replace("Z", "+00:00"))
        if ws.tzinfo is None:
            ws = ws.replace(tzinfo=KST)
    except ValueError as e:
        print(f"Invalid week_start format: {week_start} ({e})")
        raise HTTPException(status_code=400, detail="week_start 형식 오류 (ISO 8601)")
    we = ws + timedelta(days=7)

    all_todos = (
        sb.table("todos")
        .select("id, name, priority, done, created_at, completed_at, deadline")
        .eq("user_id", user_id)
        .execute()
    ).data or []

    completed = [
        t for t in all_todos
        if t.get("completed_at") and ws.isoformat() <= t["completed_at"] < we.isoformat()
    ]
    created = [
        t for t in all_todos
        if t.get("created_at") and ws.isoformat() <= t["created_at"] < we.isoformat()
    ]
    overdue = [
        t for t in all_todos
        if not t["done"] and t.get("created_at", "") < ws.isoformat()
    ]

    by_priority: dict = {}
    for p in ("urgent", "mid", "normal"):
        group = [t for t in all_todos if t.get("priority") == p]
        by_priority[p] = {
            "done": sum(1 for t in group if t["done"]),
            "todo": sum(1 for t in group if not t["done"]),
        }

    total_created = len(created)
    total_completed = len(completed)
    rate = round(total_completed / total_created, 3) if total_created else 0.0

    return JSONResponse({
        "week_start": ws.isoformat(),
        "week_end": we.isoformat(),
        "completed": total_completed,
        "created": total_created,
        "completion_rate": rate,
        "overdue": overdue,
        "by_priority": by_priority,
    })
