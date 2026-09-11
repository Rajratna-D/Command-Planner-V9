"""Task model — priority-sorted tasks with recurrence support."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[str] = mapped_column(String, default="Someday", index=True)  # Immediate, Important, 2nd Priority, 3rd Priority, Someday
    due: Mapped[str | None] = mapped_column(String, nullable=True, index=True)  # YYYY-MM-DD or empty
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    recur: Mapped[str] = mapped_column(String, default="None")  # None, Daily, Weekly, Monthly
    spawned: Mapped[bool] = mapped_column(Boolean, default=False)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

