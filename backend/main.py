"""
COMMAND PLANNER — FastAPI Backend
Main application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import init_db
from backend.routers import (
    tasks, tests, assignments, practicals,
    lists, syllabus, pomodoro, notes,
    productivity, settings, analytics, backup, archive,
)

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


app = FastAPI(
    title="Command Planner API",
    description="Backend API for Command Planner — Academic Productivity App",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
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
