"""APScheduler 기반 알림 스케줄러"""
import logging
import os
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from server.app.database import get_supabase
from email_sender import send_email  # noqa: F401 — local email.py

_scheduler = BackgroundScheduler(timezone="Asia/Seoul")


def _remind_job() -> None:
    """1분마다: remind_at 도달한 미완료 할일 알림 발송."""
    email_to = os.environ.get("NOTIFY_TO")
    if not email_to:
        return
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    try:
        res = (
            sb.table("todos")
            .select("*")
            .lte("remind_at", now)
            .eq("reminded", False)
            .eq("done", False)
            .execute()
        )
    except Exception:
        logging.exception("remind_job: DB 조회 실패")
        return

    for todo in res.data or []:
        subject = f"[veloo] 알림: {todo['name']}"
        body = (
            f"<h3>{todo['name']}</h3>"
            f"<p>{todo.get('memo') or ''}</p>"
            f"<p>마감: {todo.get('deadline') or '미정'}</p>"
        )
        try:
            send_email(subject, body, email_to)
            sb.table("todos").update({"reminded": True}).eq("id", todo["id"]).execute()
        except Exception:
            logging.exception("remind_job: 발송/업데이트 실패 (id=%s)", todo["id"])


def _daily_summary_job() -> None:
    """매일 KST 09:00: 오늘 start_time인 할일 목록 요약 메일."""
    email_to = os.environ.get("NOTIFY_TO")
    if not email_to:
        return
    sb = get_supabase()
    today = datetime.now(timezone(timedelta(hours=9))).date()
    start = f"{today}T00:00:00+09:00"
    end = f"{today}T23:59:59+09:00"
    try:
        todos_res = (
            sb.table("todos")
            .select("name, priority, deadline, start_time")
            .gte("start_time", start)
            .lte("start_time", end)
            .eq("done", False)
            .execute()
        )
    except Exception:
        logging.exception("daily_summary_job: DB 조회 실패")
        return

    items = todos_res.data or []
    if not items:
        return
    rows = "".join(
        f"<li><b>{t['name']}</b> ({t.get('priority', 'normal')})</li>"
        for t in items
    )
    body = f"<h3>오늘 예정된 할일 ({len(items)}개)</h3><ul>{rows}</ul>"
    send_email("[veloo] 오늘의 할일 요약", body, email_to)


def start_scheduler() -> None:
    _scheduler.add_job(_remind_job, "interval", minutes=1, id="remind")
    _scheduler.add_job(
        _daily_summary_job,
        CronTrigger(hour=9, minute=0, timezone="Asia/Seoul"),
        id="daily_summary",
    )
    _scheduler.start()
    logging.info("APScheduler 시작됨")


def stop_scheduler() -> None:
    _scheduler.shutdown(wait=False)
    logging.info("APScheduler 종료됨")
