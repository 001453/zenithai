"""Orders & positions - paper trade, list (auth required)."""
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.database import DbSession
from app.core.deps import CurrentUser
from app.services.execution import service as execution_service

router = APIRouter()


class PaperOrderCreate(BaseModel):
    symbol: str
    side: str  # buy | sell
    quantity: Decimal
    price: Decimal | None = None
    strategy_id: int | None = None
    exchange: str = "binance"


@router.post("/paper", summary="Kağıt emir gönder")
async def submit_paper_order(
    body: PaperOrderCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await execution_service.submit_paper_order(
        db=db,
        user_id=current_user.id,
        symbol=body.symbol,
        side=body.side,
        quantity=body.quantity,
        price=body.price,
        strategy_id=body.strategy_id,
        exchange=body.exchange,
    )


@router.get("/paper", summary="Kağıt emirleri listele")
async def list_orders(
    db: DbSession,
    current_user: CurrentUser,
    strategy_id: int | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    return await execution_service.list_orders(
        db=db, user_id=current_user.id, strategy_id=strategy_id, limit=limit, offset=offset
    )


@router.get("/positions", summary="Açık pozisyonları listele")
async def list_positions(db: DbSession, current_user: CurrentUser) -> dict:
    return await execution_service.list_positions(db=db, user_id=current_user.id)
