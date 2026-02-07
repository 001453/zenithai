"""Order model - paper ve live emir kaydı."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Order(Base):
    """Tekil emir: al/sat, miktar, fiyat, durum."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    strategy_id: Mapped[int | None] = mapped_column(
        ForeignKey("strategies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    symbol: Mapped[str] = mapped_column(String(50))
    side: Mapped[str] = mapped_column(String(10))  # buy | sell
    order_type: Mapped[str] = mapped_column(String(20), default="market")  # market | limit | stop_market | stop_limit
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)  # limit fiyat
    stop_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)  # stop tetikleme fiyatı
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | filled | cancelled
    mode: Mapped[str] = mapped_column(String(20), default="paper")  # paper | live
    exchange_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # borsa emir id
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    filled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    realized_pnl: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)  # kapanışta gerçekleşen kar/zarar
