"""Periyodik strateji çalıştırıcı: aktif botları tick'ler, MA cross veya ML sinyal ile paper emir."""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.strategy import Strategy
from app.services.execution import service as execution_service
from app.services.market_data import service as market_service
from app.services.ml import service as ml_service
from app.services.ml import trainer as ml_trainer
from app.services.strategy_engine import signals

TICK_INTERVAL_SEC = 60.0
PAPER_ORDER_QUANTITY = Decimal("0.001")


async def run_strategy_tick() -> None:
    """Aktif stratejileri al; ML model veya indikatör sinyali ile paper emir gönder."""
    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(Strategy).where(Strategy.is_active.is_(True))
            )
            strategies = result.scalars().all()
        except Exception:
            await db.rollback()
            return
        for s in strategies:
            try:
                if s.mode != "paper":
                    continue
                ohlcv_res = await market_service.get_ohlcv(
                    s.exchange, s.symbol, "1h", limit=50
                )
                candles = ohlcv_res.get("candles") or []

                if s.ml_model_id:
                    features = ml_trainer.ohlcv_to_feature_dict(candles)
                    pred = await ml_service.predict_signal(
                        db, s.user_id, s.ml_model_id, features
                    )
                    if not pred.get("ok") or "sinyal" not in pred:
                        continue
                    side = "buy" if pred["sinyal"] == 1 else "sell"
                else:
                    signal = signals.get_signal(s.type, candles, s.params_json or "{}")
                    if not signal:
                        continue
                    side = "buy" if signal == "buy" else "sell"

                await execution_service.submit_paper_order(
                    db=db,
                    user_id=s.user_id,
                    symbol=s.symbol,
                    side=side,
                    quantity=PAPER_ORDER_QUANTITY,
                    strategy_id=s.id,
                    exchange=s.exchange,
                )
            except Exception:
                continue
        try:
            await db.commit()
        except Exception:
            await db.rollback()


async def scheduler_loop() -> None:
    """Sonsuz döngü: her TICK_INTERVAL_SEC saniyede bir run_strategy_tick."""
    while True:
        try:
            await run_strategy_tick()
        except asyncio.CancelledError:
            break
        except Exception:
            pass
        await asyncio.sleep(TICK_INTERVAL_SEC)
