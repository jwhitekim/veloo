"""이메일 발송 유틸리티 — Gmail SMTP + App Password"""
import logging
import os
import smtplib
from email.mime.text import MIMEText


def send_email(subject: str, html_body: str, to_addr: str) -> None:
    smtp_user = os.getenv("SMTP_USER")
    smtp_pw = os.getenv("SMTP_APP_PASSWORD")
    if not smtp_user or not smtp_pw:
        logging.warning("SMTP_USER / SMTP_APP_PASSWORD 미설정 — 메일 발송 건너뜀")
        return
    msg = MIMEText(html_body, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_addr
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pw)
            server.send_message(msg)
    except Exception:
        logging.exception("메일 발송 실패 (to=%s)", to_addr)
