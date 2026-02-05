"""Trading strategy model."""

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Strategy(Base):
    """User-defined trading strategy (bot)."""

    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))  # ma_cross, rsi, custom, ...
    params_json: Mapped[str] = mapped_column(Text, default="{}")  # JSON string for flexibility
    symbol: Mapped[str] = mapped_column(String(50))
    exchange: Mapped[str] = mapped_column(String(50))
    mode: Mapped[str] = mapped_column(String(20), default="paper")  # paper | live
    is_active: Mapped[bool] = mapped_column(default=False)
    ml_model_id: Mapped[int | None] = mapped_column(
        ForeignKey("ml_models.id", ondelete="SET NULL"), index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

