"""
Database configuration — SQLAlchemy engine + session factory.
Uses SQLite file-based database (planner.db) in the backend directory.
"""
import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

def utcnow():
    """Python 3.12+ compliant replacement for datetime.utcnow()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "planner.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
    echo=False,
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable WAL mode, synchronous=NORMAL, and foreign keys for high performance & concurrency."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db():
    """Dependency that yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Ensure existing tables have tags columns if they already exist."""
    import sqlite3
    if not os.path.exists(DB_PATH):
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        for table in ["tasks", "assignments", "notes"]:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]
            if columns and "tags" not in columns:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN tags TEXT")
        
        # Check topics table for in_progress column
        cursor.execute("PRAGMA table_info(topics)")
        columns = [row[1] for row in cursor.fetchall()]
        if columns and "in_progress" not in columns:
            cursor.execute("ALTER TABLE topics ADD COLUMN in_progress BOOLEAN DEFAULT 0")

        # Add archived column to archivable tables
        for table in ["tasks", "assignments", "notes", "practicals"]:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]
            if columns and "archived" not in columns:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN archived BOOLEAN DEFAULT 0")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")


def init_db():
    """Create all tables if they don't exist yet."""
    run_migrations()
    from backend.models import task, test, assignment, practical, list_model, syllabus, pomodoro, note, settings  # noqa: F401
    Base.metadata.create_all(bind=engine)

