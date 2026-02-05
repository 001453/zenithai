"""Backtest run model - strateji + tarih aralığı + sonuç metrikleri."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class BacktestRun(Base):
    """Tek bir backtest çalıştırması: hangi strateji, aralık, metrikler."""

    __tablename__ = "backtest_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("strategies.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(50))
    exchange: Mapped[str] = mapped_column(String(50))
    timeframe: Mapped[str] = mapped_column(String(20))
    start_ts: Mapped[datetime] = mapped_column()
    end_ts: Mapped[datetime] = mapped_column()
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    final_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8))
    total_return_pct: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    total_trades: Mapped[int] = mapped_column(default=0)
    win_rate_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # ek metrikler
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
