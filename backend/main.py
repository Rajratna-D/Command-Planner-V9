"""
COMMAND PLANNER — FastAPI Backend
Main application entry point.

Security Hardening:
- ASGI middleware enforces a 1MB max request body size to prevent memory exhaustion.
- Generic exception handler hides Python stack traces from API responses.
- CORS configured for frontend dev server only.
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from backend.database import init_db
from backend.routers import (
    tasks, tests, assignments, practicals,
    lists, syllabus, pomodoro, notes,
    productivity, settings, analytics, backup, archive,
)

logger = logging.getLogger("command_planner")


# ══════════════════════════════════════════════════════════════════════════
# SECURITY MIDDLEWARE: Request Body Size Limiter
# ══════════════════════════════════════════════════════════════════════════

MAX_BODY_SIZE = 1 * 1024 * 1024  # 1 MB


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds the configured maximum.

    This prevents denial-of-service attacks where a client sends an extremely
    large JSON payload (e.g., 500MB note body) that would exhaust server memory
    before Pydantic validation even runs.
    """

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_BODY_SIZE:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body too large. "
                                      f"Maximum allowed size is {MAX_BODY_SIZE // 1024}KB."
                        },
                    )
            except ValueError:
                pass  # Malformed Content-Length header — let downstream handle it
        return await call_next(request)


# ══════════════════════════════════════════════════════════════════════════
# APPLICATION LIFESPAN
# ══════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all tables and run auto-backup on startup."""
    init_db()
    try:
        from backend.routers.backup import create_backup, DB_PATH
        import sqlite3
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            count = cur.fetchone()[0]
            conn.close()
            if count > 0:
                create_backup()
    except Exception:
        pass
    yield


# ══════════════════════════════════════════════════════════════════════════
# APPLICATION INSTANCE
# ══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Command Planner API",
    description="Backend API for Command Planner — Academic Productivity App",
    version="9.3.0",
    lifespan=lifespan,
)


# ══════════════════════════════════════════════════════════════════════════
# SECURITY: Generic Exception Handler (Hide Stack Traces)
# ══════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ══════════════════════════════════════════════════════════════════════════
# MIDDLEWARE STACK
# ══════════════════════════════════════════════════════════════════════════

app.add_middleware(BodySizeLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════
# ROUTER REGISTRATION (Both root prefixes and /api prefixes)
# ══════════════════════════════════════════════════════════════════════════

all_routers = [
    tasks.router, tests.router, assignments.router, practicals.router,
    lists.router, syllabus.router, pomodoro.router, notes.router,
    productivity.router, settings.router, analytics.router, backup.router, archive.router,
]

api_router = APIRouter(prefix="/api")
for r in all_routers:
    api_router.include_router(r)
    app.include_router(r)

app.include_router(api_router)


# ══════════════════════════════════════════════════════════════════════════
# HEALTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}


# ══════════════════════════════════════════════════════════════════════════
# STATIC ASSETS & SPA ROUTING (Desktop / Production mode)
# ══════════════════════════════════════════════════════════════════════════

if getattr(sys, "frozen", False):
    base_dist = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    FRONTEND_DIST = os.path.join(base_dist, "frontend", "dist")
else:
    FRONTEND_DIST = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    )

def get_persisted_theme() -> str:
    """Retrieve persisted theme from settings database or default to dark."""
    try:
        from backend.database import SessionLocal
        from backend.models.settings import Setting
        import json
        db = SessionLocal()
        s = db.query(Setting).filter(Setting.key == "theme").first()
        db.close()
        if s and s.value:
            val = json.loads(s.value) if isinstance(s.value, str) else s.value
            if isinstance(val, str) and val.strip():
                return val.strip()
    except Exception:
        pass
    return "dark"

def render_spa_index(index_file: str):
    """Serve index.html with the persisted theme pre-rendered in DOM and localStorage."""
    try:
        with open(index_file, "r", encoding="utf-8") as f:
            html = f.read()
        theme = get_persisted_theme()
        if theme != "dark":
            html = html.replace('data-theme="dark"', f'data-theme="{theme}"')
        injection = f'<script>try{{if(!localStorage.getItem("cp-theme")||localStorage.getItem("cp-theme")=="dark"){{localStorage.setItem("cp-theme","{theme}");document.documentElement.setAttribute("data-theme","{theme}");}}}}catch(e){{}}</script>'
        html = html.replace("<head>", f"<head>\n    {injection}")
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html, media_type="text/html")
    except Exception:
        return FileResponse(index_file)

if os.path.exists(FRONTEND_DIST):
    assets_path = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/")
    async def root():
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return render_spa_index(index_file)
        return {
            "app": "Command Planner",
            "version": "1.0.0",
            "status": "running",
        }

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path in ("health", "docs", "openapi.json", "redoc") or full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return render_spa_index(index_file)
        return JSONResponse(status_code=404, content={"detail": "Not found"})
else:
    @app.get("/")
    def root():
        return {
            "app": "Command Planner",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs",
        }
