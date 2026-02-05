"""Position model - açık pozisyon özeti (paper/live)."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Position(Base):
    """Kullanıcı + sembol bazlı açık pozisyon (ortalama giriş, miktar)."""

    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(50), index=True)
    side: Mapped[str] = mapped_column(String(10))  # long | short
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    entry_price_avg: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    mode: Mapped[str] = mapped_column(String(20), default="paper")  # paper | live
    updated_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
