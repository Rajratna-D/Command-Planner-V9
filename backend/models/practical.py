"""Practical model — lab experiments with multi-stage completion."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class Practical(Base):
    __tablename__ = "practicals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject: Mapped[str] = mapped_column(String, nullable=False)
    num: Mapped[str] = mapped_column(String, default="")  # Experiment number
    title: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[str] = mapped_column(String, default="")  # YYYY-MM-DD
    performed: Mapped[bool] = mapped_column(Boolean, default=False)
    writeup: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # Auto-set when all 3 stages complete
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
