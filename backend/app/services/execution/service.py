"""Execution: paper emir, pozisyon aç/kapa, realized_pnl (risk limit kontrolü)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.position import Position
from app.services.risk import service as risk_service
from app.services.market_data import service as market_service


async def _fill_price_alis(symbol: str, exchange: str, limit_fiyat: Decimal | None) -> Decimal:
    """Emir için kullanılacak doldurma fiyatı: limit varsa o, yoksa borsadan son fiyat."""
    if limit_fiyat is not None and limit_fiyat > 0:
        return limit_fiyat
    data = await market_service.get_ticker(exchange, symbol)
    last = data.get("last")
    if last is not None:
        return Decimal(str(last))
    return Decimal("0")


async def submit_paper_order(
    db: AsyncSession,
    user_id: int,
    symbol: str,
    side: str,
    quantity: Decimal,
    price: Decimal | None = None,
    stop_price: Decimal | None = None,
    order_type: str = "market",
    strategy_id: int | None = None,
    exchange: str = "binance",
) -> dict[str, Any]:
    """Paper emir: risk kontrolü, Order kaydı, pozisyon güncelleme ve realized_pnl.
    order_type: market | limit | stop_market | stop_limit. Stop emirler kağıtta anında doldurulur (tetikleme simüle).
    """
    izin_var, hata = await risk_service.check_risk(
        db, user_id, symbol, side, quantity, strategy_id
    )
    if not izin_var:
        return {"ok": False, "hata": hata or "Risk limiti aşıldı."}

    # Stop emirlerde: stop_market -> piyasa fiyatı, stop_limit -> limit fiyat kullan
    use_limit_price = order_type == "limit" or order_type == "stop_limit"
    effective_price = price if use_limit_price else None
    fill_price = await _fill_price_alis(symbol, exchange, effective_price)

    order = Order(
        user_id=user_id,
        strategy_id=strategy_id,
        symbol=symbol,
        side=side,
        order_type=order_type,
        quantity=quantity,
        price=price,
        stop_price=stop_price,
        status="filled",
        mode="paper",
        realized_pnl=None,
    )
    db.add(order)
    await db.flush()

    if side == "buy":
        short_pos = (
            await db.execute(
                select(Position).where(
                    Position.user_id == user_id,
                    Position.symbol == symbol,
                    Position.side == "short",
                    Position.mode == "paper",
                )
            )
        ).scalar_one_or_none()
        if short_pos and short_pos.quantity > 0:
            kapanan = min(quantity, short_pos.quantity)
            order.realized_pnl = (short_pos.entry_price_avg - fill_price) * kapanan
            short_pos.quantity -= kapanan
            short_pos.updated_at = datetime.now(timezone.utc)
            if short_pos.quantity <= 0:
                await db.delete(short_pos)
        else:
            long_pos = (
                await db.execute(
                    select(Position).where(
                        Position.user_id == user_id,
                        Position.symbol == symbol,
                        Position.side == "long",
                        Position.mode == "paper",
                    )
                )
            ).scalar_one_or_none()
            if long_pos:
                toplam_qty = long_pos.quantity + quantity
                long_pos.entry_price_avg = (
                    long_pos.quantity * long_pos.entry_price_avg + quantity * fill_price
                ) / toplam_qty
                long_pos.quantity = toplam_qty
                long_pos.updated_at = datetime.now(timezone.utc)
            else:
                db.add(
                    Position(
                        user_id=user_id,
                        symbol=symbol,
                        side="long",
                        quantity=quantity,
                        entry_price_avg=fill_price,
                        mode="paper",
                    )
                )
    else:
        long_pos = (
            await db.execute(
                select(Position).where(
                    Position.user_id == user_id,
                    Position.symbol == symbol,
                    Position.side == "long",
                    Position.mode == "paper",
                )
            )
        ).scalar_one_or_none()
        if long_pos and long_pos.quantity > 0:
            kapanan = min(quantity, long_pos.quantity)
            order.realized_pnl = (fill_price - long_pos.entry_price_avg) * kapanan
            long_pos.quantity -= kapanan
            long_pos.updated_at = datetime.now(timezone.utc)
            if long_pos.quantity <= 0:
                await db.delete(long_pos)
        else:
            short_pos = (
                await db.execute(
                    select(Position).where(
                        Position.user_id == user_id,
                        Position.symbol == symbol,
                        Position.side == "short",
                        Position.mode == "paper",
                    )
                )
            ).scalar_one_or_none()
            if short_pos:
                toplam_qty = short_pos.quantity + quantity
                short_pos.entry_price_avg = (
                    short_pos.quantity * short_pos.entry_price_avg + quantity * fill_price
                ) / toplam_qty
                short_pos.quantity = toplam_qty
                short_pos.updated_at = datetime.now(timezone.utc)
            else:
                db.add(
                    Position(
                        user_id=user_id,
                        symbol=symbol,
                        side="short",
                        quantity=quantity,
                        entry_price_avg=fill_price,
                        mode="paper",
                    )
                )

    await db.flush()
    return {
        "ok": True,
        "id": order.id,
        "durum": order.status,
        "mesaj": "Kağıt emir gerçekleştirildi.",
        "realized_pnl": str(order.realized_pnl) if order.realized_pnl is not None else None,
    }


async def list_orders(
    db: AsyncSession,
    user_id: int,
    strategy_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    """Kullanıcının emirlerini listeler."""
    q = select(Order).where(Order.user_id == user_id)
    if strategy_id is not None:
        q = q.where(Order.strategy_id == strategy_id)
    q = q.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    orders = result.scalars().all()
    items = [
        {
            "id": o.id,
            "strategy_id": o.strategy_id,
            "symbol": o.symbol,
            "side": o.side,
            "order_type": o.order_type,
            "quantity": str(o.quantity),
            "price": str(o.price) if o.price else None,
            "stop_price": str(o.stop_price) if o.stop_price else None,
            "status": o.status,
            "mode": o.mode,
            "realized_pnl": str(o.realized_pnl) if o.realized_pnl is not None else None,
            "created_at": o.created_at,
        }
        for o in orders
    ]
    return {"orders": items}


async def list_positions(db: AsyncSession, user_id: int) -> dict[str, Any]:
    """Kullanıcının açık pozisyonlarını listeler."""
    result = await db.execute(
        select(Position).where(Position.user_id == user_id)
    )
    positions = result.scalars().all()
    items = [
        {
            "id": p.id,
            "symbol": p.symbol,
            "side": p.side,
            "quantity": str(p.quantity),
            "entry_price_avg": str(p.entry_price_avg),
            "mode": p.mode,
            "updated_at": p.updated_at,
        }
        for p in positions
    ]
    return {"positions": items}
