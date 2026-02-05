"""Strategies & bots: list, create, start/stop - delegates to strategy_engine."""
from fastapi import APIRouter, Depends, HTTPException, status

from pydantic import BaseModel

from app.core.database import DbSession
from app.core.deps import CurrentUser
from app.services.strategy_engine import service as strategy_service

router = APIRouter()


class StrategyCreate(BaseModel):
    name: str
    type: str = "ma_cross"  # ma_cross, rsi, ml_signal, custom
    params: dict = {}
    symbol: str = "BTC/USDT"
    exchange: str = "binance"
    mode: str = "paper"  # paper | live
    ml_model_id: int | None = None  # doluysa sinyal ML modelden alınır


@router.get("")
async def list_strategies(db: DbSession, current_user: CurrentUser) -> dict:
    """Mevcut kullanıcının stratejilerini listeler."""
    return await strategy_service.list_strategies(db, current_user.id)


@router.get("/{strategy_id}", summary="Tek strateji detayı")
async def get_strategy(
    strategy_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Strateji detayını döner."""
    strategy = await strategy_service.get_strategy(db, strategy_id, current_user.id)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strateji bulunamadı")
    return {"strategy": strategy}


@router.post("")
async def create_strategy(
    body: StrategyCreate, db: DbSession, current_user: CurrentUser
) -> dict:
    """Create a strategy (owned by current user)."""
    return await strategy_service.create_strategy(
        db=db,
        user_id=current_user.id,
        name=body.name,
        strategy_type=body.type,
        params=body.params,
        symbol=body.symbol,
        exchange=body.exchange,
        mode=body.mode,
        ml_model_id=body.ml_model_id,
    )


@router.post("/{strategy_id}/start")
async def start_strategy(
    strategy_id: int, db: DbSession, current_user: CurrentUser
) -> dict:
    return await strategy_service.start_strategy(db, strategy_id, current_user.id)


@router.post("/{strategy_id}/stop")
async def stop_strategy(
    strategy_id: int, db: DbSession, current_user: CurrentUser
) -> dict:
    return await strategy_service.stop_strategy(db, strategy_id, current_user.id)


class StrategyUpdate(BaseModel):
    ml_model_id: int | None = None
    params: dict | None = None  # short_period, long_period, rsi_period vb.


@router.patch("/{strategy_id}", summary="Strateji güncelle (ML model bağla, parametreler)")
async def update_strategy(
    strategy_id: int,
    body: StrategyUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await strategy_service.update_strategy(
        db=db, strategy_id=strategy_id, user_id=current_user.id,
        ml_model_id=body.ml_model_id, params=body.params
    )


@router.delete("/{strategy_id}", summary="Strateji sil")
async def delete_strategy(
    strategy_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await strategy_service.delete_strategy(
        db=db, strategy_id=strategy_id, user_id=current_user.id
    )
