"""Assignment model — tracks submissions and deadlines."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    due: Mapped[str] = mapped_column(String, default="", index=True)  # YYYY-MM-DD
    marks: Mapped[str] = mapped_column(String, default="")
    submitted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

