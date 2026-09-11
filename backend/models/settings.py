"""Settings model — key-value store for app configuration."""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")  # JSON-encoded value
