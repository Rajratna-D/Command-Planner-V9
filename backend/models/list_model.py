"""List model — running lists with nested checkable items."""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base, utcnow


class List(Base):
    __tablename__ = "lists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    items: Mapped[list["ListItem"]] = relationship(
        "ListItem", back_populates="list", cascade="all, delete-orphan",
        order_by="ListItem.created_at"
    )


class ListItem(Base):
    __tablename__ = "list_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    list_id: Mapped[str] = mapped_column(String, ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(String, nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    list: Mapped["List"] = relationship("List", back_populates="items")
