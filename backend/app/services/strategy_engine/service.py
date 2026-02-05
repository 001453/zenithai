"""Strategy engine - list/create/start/stop strategies using DB models."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.strategy import Strategy


async def list_strategies(db: AsyncSession, user_id: int) -> dict[str, Any]:
    result = await db.execute(select(Strategy).where(Strategy.user_id == user_id))
    strategies = result.scalars().all()
    items: list[dict[str, Any]] = []
    for s in strategies:
        items.append(
            {
                "id": s.id,
                "name": s.name,
                "type": s.type,
                "params": json.loads(s.params_json) if s.params_json else {},
                "symbol": s.symbol,
                "exchange": s.exchange,
                "mode": s.mode,
                "is_active": s.is_active,
                "ml_model_id": s.ml_model_id,
                "created_at": s.created_at,
            }
        )
    return {"strategies": items}


async def get_strategy(db: AsyncSession, strategy_id: int, user_id: int) -> dict[str, Any] | None:
    """Tek bir stratejiyi döner. Sahip değilse None."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return None
    return {
        "id": strategy.id,
        "name": strategy.name,
        "type": strategy.type,
        "params": json.loads(strategy.params_json) if strategy.params_json else {},
        "symbol": strategy.symbol,
        "exchange": strategy.exchange,
        "mode": strategy.mode,
        "is_active": strategy.is_active,
        "ml_model_id": strategy.ml_model_id,
        "created_at": strategy.created_at,
    }


async def create_strategy(
    db: AsyncSession,
    user_id: int,
    name: str,
    strategy_type: str,
    params: dict,
    symbol: str,
    exchange: str,
    mode: str,
    ml_model_id: int | None = None,
) -> dict[str, Any]:
    params_json = json.dumps(params)
    strategy = Strategy(
        user_id=user_id,
        name=name,
        type=strategy_type,
        params_json=params_json,
        symbol=symbol,
        exchange=exchange,
        mode=mode,
        is_active=False,
        ml_model_id=ml_model_id,
    )
    db.add(strategy)
    await db.flush()
    return {"id": strategy.id, "mesaj": "Strateji oluşturuldu. Başlatmak için start çağrısı yapın."}


async def start_strategy(
    db: AsyncSession, strategy_id: int, user_id: int
) -> dict[str, Any]:
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return {"ok": False, "hata": "Strateji bulunamadı"}
    strategy.is_active = True
    return {"ok": True, "mesaj": "Strateji başlatıldı."}


async def stop_strategy(
    db: AsyncSession, strategy_id: int, user_id: int
) -> dict[str, Any]:
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return {"ok": False, "hata": "Strateji bulunamadı"}
    strategy.is_active = False
    return {"ok": True, "mesaj": "Strateji durduruldu."}


async def update_strategy(
    db: AsyncSession,
    strategy_id: int,
    user_id: int,
    ml_model_id: int | None = None,
    params: dict | None = None,
) -> dict[str, Any]:
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return {"ok": False, "hata": "Strateji bulunamadı"}
    if ml_model_id is not None:
        strategy.ml_model_id = ml_model_id
    if params is not None:
        strategy.params_json = json.dumps(params)
    return {"ok": True, "mesaj": "Strateji güncellendi."}


async def delete_strategy(
    db: AsyncSession, strategy_id: int, user_id: int
) -> dict[str, Any]:
    """Stratejiyi siler (önce durdurulur). Emirler strategy_id=NULL kalır, risk/backtest CASCADE silinir."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return {"ok": False, "hata": "Strateji bulunamadı"}
    strategy.is_active = False
    await db.delete(strategy)
    await db.flush()
    return {"ok": True, "mesaj": "Strateji silindi."}
