"""ML: list models, register, set active, predict (auth required)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.database import DbSession
from app.core.deps import CurrentUser
from app.services.ml import service as ml_service

router = APIRouter()


class RegisterModelRequest(BaseModel):
    name: str
    version: str
    task: str = "classification"
    symbol: str | None = None
    timeframe: str | None = None
    artifact_path: str | None = None
    params: dict | None = None
    metrics: dict | None = None


class PredictRequest(BaseModel):
    model_id: int
    features: dict[str, float]


class TrainRequest(BaseModel):
    symbol: str = "BTC/USDT"
    exchange: str = "binance"
    timeframe: str = "1h"
    name: str
    version: str = "v1"


@router.post("/train", summary="OHLCV ile model eğit")
async def train_model(
    body: TrainRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await ml_service.train_from_ohlcv(
        db=db,
        user_id=current_user.id,
        symbol=body.symbol,
        exchange=body.exchange,
        timeframe=body.timeframe,
        name=body.name,
        version=body.version,
    )


@router.get("/models", summary="ML modellerini listele")
async def list_models(db: DbSession, current_user: CurrentUser) -> dict:
    return await ml_service.list_models(db=db, user_id=current_user.id)


@router.post("/models", summary="ML modeli kaydet")
async def register_model(
    body: RegisterModelRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await ml_service.register_model(
        db=db,
        user_id=current_user.id,
        name=body.name,
        version=body.version,
        task=body.task,
        symbol=body.symbol,
        timeframe=body.timeframe,
        artifact_path=body.artifact_path,
        params=body.params,
        metrics=body.metrics,
    )


@router.post("/models/{model_id}/activate", summary="Modeli aktif yap")
async def activate_model(
    model_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await ml_service.set_active_model(
        db=db, user_id=current_user.id, model_id=model_id
    )


@router.post("/predict", summary="Modelden sinyal al")
async def predict(
    body: PredictRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    return await ml_service.predict_signal(
        db=db,
        user_id=current_user.id,
        model_id=body.model_id,
        features=body.features,
    )
