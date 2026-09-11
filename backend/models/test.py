"""Test model — exams/tests with countdown tracking."""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[str] = mapped_column(String, nullable=False, index=True)  # YYYY-MM-DD
    time: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
