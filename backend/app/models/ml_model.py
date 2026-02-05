"""ML model metadata - eğitilmiş model kaydı (sinyal üretimi için)."""
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class MLModel(Base):
    """Eğitilmiş model: isim, versiyon, path/artifact, parametreler."""

    __tablename__ = "ml_models"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    version: Mapped[str] = mapped_column(String(50))
    task: Mapped[str] = mapped_column(String(50))  # classification | regression | signal
    symbol: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timeframe: Mapped[str | None] = mapped_column(String(20), nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(500), nullable=True)  # dosya/object path
    params_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
