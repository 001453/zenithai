"""Backtest: run & list (auth required)."""
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.database import DbSession
from app.core.deps import CurrentUser
from app.services.backtest import service as backtest_service

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_id: int
    symbol: str = "BTC/USDT"
    exchange: str = "binance"
    timeframe: str = "1h"
    start_ts: datetime
    end_ts: datetime
    initial_balance: Decimal = Decimal("10000")


@router.post("/run", summary="Backtest çalıştır")
async def run_backtest(
    body: BacktestRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await backtest_service.run_backtest(
        db=db,
        user_id=current_user.id,
        strategy_id=body.strategy_id,
        symbol=body.symbol,
        exchange=body.exchange,
        timeframe=body.timeframe,
        start_ts=body.start_ts,
        end_ts=body.end_ts,
        initial_balance=body.initial_balance,
    )


@router.get("/runs", summary="Backtest geçmişini listele")
async def list_runs(
    db: DbSession,
    current_user: CurrentUser,
    strategy_id: int | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    return await backtest_service.list_backtest_runs(
        db=db,
        user_id=current_user.id,
        strategy_id=strategy_id,
        limit=limit,
        offset=offset,
    )
