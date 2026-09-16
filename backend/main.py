"""veloo — 연구실 도구 모음 허브"""
import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.app.paper_analyzer import app as paper_app
from backend.app.translator import app as translate_app
from backend.app.contextor import app as contextor_app
from backend.app.reviwer import app as arch_app
from backend.app.todo import app as todo_app
from backend.app.todo.core.scheduler import start_scheduler, stop_scheduler
from backend.app.auth import router as auth_router, AuthMiddleware

BASE = os.path.dirname(os.path.dirname(__file__))
DIST = os.path.join(BASE, "frontend", "dist")
LOCAL_ORIGIN_RE = (
    r"^https?://"
    r"(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3}|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})"
    r"(:\d+)?$"
)
ROOT_STATIC_FILES = {
    "apple-touch-icon.png",
    "favicon.svg",
    "icon-192.png",
    "icon-512.png",
    "icon-512.svg",
    "manifest.json",
    "manifest.webmanifest",
    "registerSW.js",
    "sw.js",
}
WORKBOX_FILE_RE = re.compile(r"^workbox-[\w-]+\.js$")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not os.getenv("SUPABASE_URL"):
        logging.warning("SUPABASE_URL이 설정되지 않았습니다. 인증이 정상 동작하지 않을 수 있습니다.")
    if os.getenv("SMTP_USER"):
        start_scheduler()
    yield
    if os.getenv("SMTP_USER"):
        stop_scheduler()


app = FastAPI(title="Lab Toolkit", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=LOCAL_ORIGIN_RE,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)
app.include_router(auth_router)

app.mount("/paper", paper_app)
app.mount("/translate", translate_app)
app.mount("/model-review", arch_app)
app.mount("/todo", todo_app)
app.mount("/contextor", contextor_app)
app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")
app.mount("/marketing", StaticFiles(directory=os.path.join(DIST, "marketing")), name="marketing-assets")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse(os.path.join(DIST, "favicon.svg"), media_type="image/svg+xml")


@app.get("/{filename}")
async def root_static(filename: str):
    if filename == "manifest.json":
        path = os.path.join(DIST, "manifest.json")
        if not os.path.isfile(path):
            path = os.path.join(DIST, "manifest.webmanifest")
        if os.path.isfile(path):
            return FileResponse(path, media_type="application/manifest+json")

    if filename in ROOT_STATIC_FILES or WORKBOX_FILE_RE.fullmatch(filename):
        path = os.path.join(DIST, filename)
        if os.path.isfile(path):
            headers = {"Cache-Control": "no-cache"} if filename == "sw.js" else None
            return FileResponse(path, headers=headers)
    return FileResponse(os.path.join(DIST, "index.html"))


@app.get("/{full_path:path}")
async def spa(full_path: str):
    return FileResponse(os.path.join(DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 9000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
