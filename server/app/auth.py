"""인증 미들웨어, 유틸리티, 라우터"""
import os
import re
import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import bcrypt as _bcrypt
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from supabase import create_client, Client

_supabase: Client | None = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
        _supabase = create_client(url, key)
    return _supabase


def _hash_pw(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify_pw(password: str, hashed: str) -> bool:
    return _bcrypt.checkpw(password.encode(), hashed.encode())


_login_attempts: dict[str, list[datetime]] = defaultdict(list)
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

_API_PREFIXES = ("/paper/", "/translate/", "/model-review/", "/todo/", "/contextor/")
_OPEN_PATHS = {
    "/",
    "/login",
    "/signup",
    "/logout",
    "/register",
    "/api/me",
    "/apple-touch-icon.png",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-512.svg",
    "/manifest.json",
    "/manifest.webmanifest",
    "/registerSW.js",
    "/sw.js",
}
_OPEN_PREFIXES = ("/assets/", "/marketing/", "/workbox-")

USERNAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$")
RESERVED_USERNAMES = {
    "admin",
    "api",
    "assets",
    "contextor",
    "login",
    "logout",
    "model-review",
    "paper",
    "pricing",
    "register",
    "settings",
    "signup",
    "todo",
    "translate",
}


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )


def _is_rate_limited(ip: str) -> bool:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=LOCKOUT_MINUTES)
    _login_attempts[ip] = [t for t in _login_attempts[ip] if t > cutoff]
    return len(_login_attempts[ip]) >= MAX_ATTEMPTS


def _record_failure(ip: str) -> None:
    _login_attempts[ip].append(datetime.now(timezone.utc))


def _clear_attempts(ip: str) -> None:
    _login_attempts.pop(ip, None)


def _secure_cookie(request: Request) -> bool:
    configured = os.getenv("SECURE_COOKIE")
    if configured is not None:
        return configured.lower() not in {"0", "false", "no"}
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    return request.url.scheme == "https" or forwarded_proto.split(",")[0].strip() == "https"


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in _OPEN_PATHS or path.startswith(_OPEN_PREFIXES):
            return await call_next(request)

        token = request.cookies.get("access_token")
        if token:
            result = (
                get_supabase()
                .table("sessions")
                .select("user_id, expires_at")
                .eq("token", token)
                .execute()
            )
            if result.data:
                expires_at = datetime.fromisoformat(result.data[0]["expires_at"])
                if expires_at > datetime.now(timezone.utc):
                    request.state.user_id = result.data[0]["user_id"]
                    return await call_next(request)
                get_supabase().table("sessions").delete().eq("token", token).execute()

        if any(path.startswith(p) for p in _API_PREFIXES):
            return JSONResponse(
                {"error": "세션이 만료됐습니다. 다시 로그인해주세요."}, status_code=401
            )
        redirect_path = path
        if request.url.query:
            redirect_path = f"{redirect_path}?{request.url.query}"
        return RedirectResponse(url=f"/login?redirect={quote(redirect_path, safe='')}")


router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    username = req.username.strip().lower()
    if not USERNAME_RE.fullmatch(username):
        return JSONResponse(
            {"error": "사용자명은 영문 소문자, 숫자, 하이픈을 사용해 3~30자로 입력해주세요."},
            status_code=400,
        )
    if username in RESERVED_USERNAMES:
        return JSONResponse({"error": "사용할 수 없는 사용자명입니다."}, status_code=400)
    if len(req.password) < 8:
        return JSONResponse({"error": "비밀번호는 8자 이상 입력해주세요."}, status_code=400)

    db = get_supabase()
    existing = db.table("users").select("id").eq("username", username).execute()
    if existing.data:
        return JSONResponse({"error": "이미 사용 중인 사용자명입니다."}, status_code=409)
    pw_hash = _hash_pw(req.password)
    db.table("users").insert({
        "username": username,
        "password_hash": pw_hash,
        "is_approved": False,
    }).execute()
    return {"ok": True, "message": "승인 대기 중입니다."}


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    ip = _get_ip(request)
    if _is_rate_limited(ip):
        return JSONResponse(
            {"error": "너무 많은 시도가 있었습니다. 15분 후 다시 시도해주세요."},
            status_code=429,
        )

    db = get_supabase()
    username = req.username.strip().lower()
    result = (
        db.table("users")
        .select("id, password_hash, is_approved")
        .eq("username", username)
        .execute()
    )
    user = result.data[0] if result.data else None

    if not user or not _verify_pw(req.password, user["password_hash"]):
        _record_failure(ip)
        return JSONResponse({"error": "사용자명 또는 비밀번호가 틀렸습니다."}, status_code=401)

    if not user["is_approved"]:
        return JSONResponse({"error": "승인 대기 중입니다."}, status_code=403)

    _clear_attempts(ip)
    token = secrets.token_hex(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    db.table("sessions").insert({
        "user_id": user["id"],
        "token": token,
        "expires_at": expires_at,
    }).execute()

    response = JSONResponse({"ok": True})
    response.set_cookie(
        "access_token", token,
        httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30,
        secure=_secure_cookie(request),
    )
    return response


@router.delete("/logout")
async def logout(request: Request):
    token = request.cookies.get("access_token")
    if token:
        get_supabase().table("sessions").delete().eq("token", token).execute()
    response = JSONResponse({"ok": True})
    response.delete_cookie("access_token", samesite="lax", secure=_secure_cookie(request))
    return response


@router.get("/api/me")
async def me(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        return JSONResponse({"error": "인증이 필요합니다."}, status_code=401)

    db = get_supabase()
    session_result = (
        db.table("sessions")
        .select("user_id, expires_at")
        .eq("token", token)
        .execute()
    )
    session = session_result.data[0] if session_result.data else None
    if not session:
        return JSONResponse({"error": "세션이 만료됐습니다."}, status_code=401)

    if datetime.fromisoformat(session["expires_at"]) <= datetime.now(timezone.utc):
        db.table("sessions").delete().eq("token", token).execute()
        return JSONResponse({"error": "세션이 만료됐습니다."}, status_code=401)

    user_result = db.table("users").select("username").eq("id", session["user_id"]).execute()
    if not user_result.data:
        return JSONResponse({"error": "사용자를 찾을 수 없습니다."}, status_code=401)

    return {"ok": True, "username": user_result.data[0]["username"]}
