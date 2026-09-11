"""Note model — rich text notes with subject tagging."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base, utcnow


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, default="Untitled")
    subject: Mapped[str] = mapped_column(String, default="General")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

