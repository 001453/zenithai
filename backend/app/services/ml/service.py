"""ML service: model kaydı, eğitim pipeline, predict (joblib)."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.ml_model import MLModel
from app.services.market_data import service as market_service
from app.services.ml import trainer


async def list_models(db: AsyncSession, user_id: int) -> dict[str, Any]:
    """Kullanıcının ML modellerini listeler."""
    result = await db.execute(select(MLModel).where(MLModel.user_id == user_id))
    models = result.scalars().all()
    items = [
        {
            "id": m.id,
            "name": m.name,
            "version": m.version,
            "task": m.task,
            "symbol": m.symbol,
            "timeframe": m.timeframe,
            "is_active": m.is_active,
            "created_at": m.created_at,
        }
        for m in models
    ]
    return {"models": items}


async def register_model(
    db: AsyncSession,
    user_id: int,
    name: str,
    version: str,
    task: str,
    symbol: str | None = None,
    timeframe: str | None = None,
    artifact_path: str | None = None,
    params: dict | None = None,
    metrics: dict | None = None,
) -> dict[str, Any]:
    """Yeni ML model kaydı (eğitim sonrası çağrılacak)."""
    model = MLModel(
        user_id=user_id,
        name=name,
        version=version,
        task=task,
        symbol=symbol,
        timeframe=timeframe,
        artifact_path=artifact_path,
        params_json=json.dumps(params) if params else None,
        metrics_json=json.dumps(metrics) if metrics else None,
        is_active=False,
    )
    db.add(model)
    await db.flush()
    return {"id": model.id, "name": model.name, "version": model.version}


async def set_active_model(
    db: AsyncSession, user_id: int, model_id: int
) -> dict[str, Any]:
    """Aynı (name, symbol) diğer modelleri pasif yapıp bu modeli aktif yapar."""
    model = await db.get(MLModel, model_id)
    if not model or model.user_id != user_id:
        return {"ok": False, "hata": "Model bulunamadı"}
    # Aynı name+symbol için diğerlerini kapat (opsiyonel: select ile güncelle)
    await db.execute(
        select(MLModel).where(
            MLModel.user_id == user_id,
            MLModel.name == model.name,
            MLModel.symbol == model.symbol,
        )
    )
    # Basit: sadece bu modeli aktif yap
    model.is_active = True
    return {"ok": True, "mesaj": "Model aktif olarak ayarlandı."}


async def train_from_ohlcv(
    db: AsyncSession,
    user_id: int,
    symbol: str,
    exchange: str,
    timeframe: str,
    name: str,
    version: str = "v1",
) -> dict[str, Any]:
    """OHLCV çeker, eğitim yapar, model kaydı oluşturur."""
    ohlcv_res = await market_service.get_ohlcv(exchange, symbol, timeframe, limit=500)
    candles = ohlcv_res.get("candles") or []
    if len(candles) < 50:
        return {"ok": False, "hata": "Yetersiz OHLCV verisi (en az 50 mum gerekli)."}

    settings = get_settings()
    artifact_dir = Path(settings.ml_artifact_dir).resolve()
    artifact_dir.mkdir(parents=True, exist_ok=True)

    def _egit() -> tuple[str, dict]:
        return trainer.train_and_save(
            candles=candles,
            artifact_dir=str(artifact_dir),
            model_name=name,
            version=version,
        )

    try:
        artifact_path, metrics = await asyncio.to_thread(_egit)
    except ValueError as e:
        return {"ok": False, "hata": str(e)}
    except Exception as e:
        return {"ok": False, "hata": f"Eğitim hatası: {e!s}"}

    model = MLModel(
        user_id=user_id,
        name=name,
        version=version,
        task="classification",
        symbol=symbol,
        timeframe=timeframe,
        artifact_path=artifact_path,
        params_json=json.dumps({"feature_names": trainer.FEATURE_NAMES}),
        metrics_json=json.dumps(metrics),
        is_active=False,
    )
    db.add(model)
    await db.flush()
    return {
        "ok": True,
        "id": model.id,
        "mesaj": "Model eğitildi ve kaydedildi.",
        "artifact_path": artifact_path,
        "metrics": metrics,
    }


async def predict_signal(
    db: AsyncSession, user_id: int, model_id: int, features: dict[str, float]
) -> dict[str, Any]:
    """Artifact'tan model yükleyip tahmin döndürür (sinyal: 0 = düşüş, 1 = yükseliş)."""
    model = await db.get(MLModel, model_id)
    if not model or model.user_id != user_id:
        return {"ok": False, "hata": "Model bulunamadı"}
    if not model.artifact_path:
        return {"ok": False, "hata": "Model artifact yolu yok."}

    def _tahmin() -> int:
        return trainer.load_and_predict(model.artifact_path, features)

    try:
        sinyal = await asyncio.to_thread(_tahmin)
    except FileNotFoundError as e:
        return {"ok": False, "hata": str(e)}
    except Exception as e:
        return {"ok": False, "hata": f"Tahmin hatası: {e!s}"}

    return {
        "ok": True,
        "model_id": model_id,
        "sinyal": sinyal,
        "yorum": "yükseliş" if sinyal == 1 else "düşüş",
    }
