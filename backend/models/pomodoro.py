"""Pomodoro session model — tracks focus sessions, breaks, and streaks."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"
    __table_args__ = (
        Index("ix_pomo_type_date", "type", "date"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[str] = mapped_column(String, nullable=False, index=True)  # YYYY-MM-DD
    time: Mapped[str] = mapped_column(String, default="")  # HH:MM
    type: Mapped[str] = mapped_column(String, default="work", index=True)  # work, break, long_break
    task: Mapped[str] = mapped_column(String, default="")
    duration_min: Mapped[int] = mapped_column(Integer, default=25)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
