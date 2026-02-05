"""Risk limit kontrolü: emir öncesi max pozisyon ve günlük zarar (Türkçe mesajlar)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.position import Position
from app.models.risk_limits import RiskLimit


def _bugun_utc_baslangic() -> datetime:
    """Bugünün UTC'de 00:00:00 anı."""
    n = datetime.now(timezone.utc)
    return n.replace(hour=0, minute=0, second=0, microsecond=0)


async def get_user_risk_limits(
    db: AsyncSession,
    user_id: int,
    strategy_id: int | None = None,
) -> RiskLimit | None:
    """Kullanıcı (ve isteğe bağlı strateji) için risk limit kaydını döner."""
    q = select(RiskLimit).where(RiskLimit.user_id == user_id)
    if strategy_id is not None:
        q = q.where(RiskLimit.strategy_id == strategy_id)
    else:
        q = q.where(RiskLimit.strategy_id.is_(None))
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def get_symbol_position_total(
    db: AsyncSession, user_id: int, symbol: str, side: str
) -> Decimal:
    """Kullanıcının bir semboldeki toplam pozisyon miktarını döner (long/short)."""
    result = await db.execute(
        select(func.coalesce(func.sum(Position.quantity), 0)).where(
            Position.user_id == user_id,
            Position.symbol == symbol,
            Position.side == ("long" if side == "buy" else "short"),
        )
    )
    total = result.scalar() or 0
    return Decimal(str(total))


async def get_daily_realized_pnl(db: AsyncSession, user_id: int) -> Decimal:
    """Bugünkü (UTC) gerçekleşen kar/zarar toplamı (Order.realized_pnl)."""
    baslangic = _bugun_utc_baslangic()
    result = await db.execute(
        select(func.coalesce(func.sum(Order.realized_pnl), 0)).where(
            Order.user_id == user_id,
            Order.realized_pnl.isnot(None),
            Order.created_at >= baslangic,
        )
    )
    toplam = result.scalar() or 0
    return Decimal(str(toplam))


async def check_risk(
    db: AsyncSession,
    user_id: int,
    symbol: str,
    side: str,
    quantity: Decimal,
    strategy_id: int | None = None,
) -> tuple[bool, str | None]:
    """
    Emir öncesi risk kontrolü.
    Returns: (izin_var_mı, hata_mesajı)
    """
    limit = await get_user_risk_limits(db, user_id, strategy_id)
    if limit is None:
        return True, None

    # Maksimum pozisyon büyüklüğü (long ve short ayrı ayrı)
    if limit.max_position_size is not None and limit.max_position_size > 0:
        mevcut = await get_symbol_position_total(db, user_id, symbol, side)
        yeni_toplam = mevcut + quantity
        if yeni_toplam > limit.max_position_size:
            return (
                False,
                f"Maksimum pozisyon limiti aşıldı (limit: {limit.max_position_size}, mevcut+yeni: {yeni_toplam}).",
            )

    # Günlük zarar limiti (bugünkü realized PnL ile)
    if limit.daily_loss_limit is not None and limit.daily_loss_limit > 0:
        gunluk_pnl = await get_daily_realized_pnl(db, user_id)
        if gunluk_pnl < -abs(limit.daily_loss_limit):
            return (
                False,
                f"Günlük zarar limiti aşıldı (limit: {limit.daily_loss_limit}).",
            )

    return True, None
