"""Risk limit model - kullanıcı/strateji bazlı limitler (opsiyonel)."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class RiskLimit(Base):
    """Kullanıcı veya strateji için max pozisyon / günlük zarar limiti."""

    __tablename__ = "risk_limits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    strategy_id: Mapped[int | None] = mapped_column(
        ForeignKey("strategies.id", ondelete="CASCADE"), index=True, nullable=True
    )
    max_position_size: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    daily_loss_limit: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
