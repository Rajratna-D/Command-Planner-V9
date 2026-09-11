"""
COMMAND PLANNER — FastAPI Backend
Main application entry point.

Security Hardening:
- ASGI middleware enforces a 1MB max request body size to prevent memory exhaustion.
- Generic exception handler hides Python stack traces from API responses.
- CORS configured for frontend dev server only.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    # Auto-backup on every launch (like desktop version)
    try:
        from backend.routers.backup import create_backup, DB_PATH
        import os
        if os.path.exists(DB_PATH):
            create_backup()
    except Exception:
        pass  # Don't block startup if backup fails
    yield


# ══════════════════════════════════════════════════════════════════════════
# APPLICATION INSTANCE
# ══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Command Planner API",
    description="Backend API for Command Planner — Academic Productivity App",
    version="1.0.0",
    lifespan=lifespan,
)


# ══════════════════════════════════════════════════════════════════════════
# SECURITY: Generic Exception Handler (Hide Stack Traces)
# ══════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return a generic 500 response.

    This prevents Python tracebacks from leaking file paths, library versions,
    database schemas, and OS usernames to API consumers. The full exception
    is still logged server-side for debugging.
    """
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

# Body size limiter (runs before CORS)
app.add_middleware(BodySizeLimitMiddleware)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════
# ROUTER REGISTRATION
# ══════════════════════════════════════════════════════════════════════════

app.include_router(tasks.router)
app.include_router(tests.router)
app.include_router(assignments.router)
app.include_router(practicals.router)
app.include_router(lists.router)
app.include_router(syllabus.router)
app.include_router(pomodoro.router)
app.include_router(notes.router)
app.include_router(productivity.router)
app.include_router(settings.router)
app.include_router(analytics.router)
app.include_router(backup.router)
app.include_router(archive.router)


# ══════════════════════════════════════════════════════════════════════════
# ROOT & HEALTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "app": "Command Planner",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
