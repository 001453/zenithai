"""Backtest service: OHLCV çek, strateji sinyali üret, metrik hesapla, DB'ye yaz."""
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import json

from app.models.backtest_run import BacktestRun
from app.models.strategy import Strategy
from app.services.market_data import service as market_service
from app.services.strategy_engine import signals


async def run_backtest(
    db: AsyncSession,
    user_id: int,
    strategy_id: int,
    symbol: str,
    exchange: str,
    timeframe: str,
    start_ts: datetime,
    end_ts: datetime,
    initial_balance: Decimal = Decimal("10000"),
) -> dict[str, Any]:
    """OHLCV alır, strateji sinyali (MA cross / RSI) ile simülasyon yapar."""
    strategy = await db.get(Strategy, strategy_id)
    if not strategy or strategy.user_id != user_id:
        return {"ok": False, "hata": "Strateji bulunamadı"}

    ohlcv_res = await market_service.get_ohlcv(exchange, symbol, timeframe, limit=500)
    candles = ohlcv_res.get("candles") or []
    if len(candles) < 2:
        return {"ok": False, "hata": "Yetersiz OHLCV verisi"}

    params = json.loads(strategy.params_json) if strategy.params_json else {}
    min_bars = 25
    if strategy.type == "ma_cross":
        min_bars = max(int(params.get("long_period", 20)), 2) + 1
    elif strategy.type == "rsi":
        min_bars = int(params.get("rsi_period", 14)) + 2

    balance = float(initial_balance)
    position = 0.0
    entry_price = 0.0
    total_trades = 0
    wins = 0
    closes = [c[4] for c in candles]

    for i in range(min_bars, len(candles)):
        slice_candles = candles[: i + 1]
        signal = signals.get_signal(strategy.type, slice_candles, strategy.params_json or "{}")
        if not signal:
            continue
        price = float(closes[i])
        if signal == "buy" and position <= 0:
            if position < 0:
                pnl = (entry_price - price) * abs(position)
                balance += pnl
                total_trades += 1
                if pnl > 0:
                    wins += 1
            position = balance * 0.1 / price if balance > 0 else 0
            entry_price = price
        elif signal == "sell" and position > 0:
            pnl = (price - entry_price) * position
            balance += pnl
            total_trades += 1
            if pnl > 0:
                wins += 1
            position = 0.0

    if position > 0:
        balance += (float(closes[-1]) - entry_price) * position
        total_trades += 1
        if float(closes[-1]) > entry_price:
            wins += 1

    final_balance = Decimal(str(round(balance, 8)))
    total_return_pct = (
        (final_balance - initial_balance) / initial_balance * 100
        if initial_balance
        else None
    )
    win_rate = (Decimal(str(wins)) / total_trades * 100) if total_trades else None

    run = BacktestRun(
        user_id=user_id,
        strategy_id=strategy_id,
        symbol=symbol,
        exchange=exchange,
        timeframe=timeframe,
        start_ts=start_ts,
        end_ts=end_ts,
        initial_balance=initial_balance,
        final_balance=final_balance,
        total_return_pct=total_return_pct,
        total_trades=total_trades,
        win_rate_pct=win_rate,
        metrics_json=json.dumps(params),
    )
    db.add(run)
    await db.flush()

    return {
        "ok": True,
        "run_id": run.id,
        "initial_balance": str(initial_balance),
        "final_balance": str(final_balance),
        "total_return_pct": float(total_return_pct) if total_return_pct else None,
        "total_trades": total_trades,
        "win_rate_pct": float(win_rate) if win_rate else None,
    }


async def list_backtest_runs(
    db: AsyncSession,
    user_id: int,
    strategy_id: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    """Kullanıcının backtest geçmişi."""
    q = select(BacktestRun).where(BacktestRun.user_id == user_id)
    if strategy_id is not None:
        q = q.where(BacktestRun.strategy_id == strategy_id)
    q = q.order_by(BacktestRun.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    runs = result.scalars().all()
    items = [
        {
            "id": r.id,
            "strategy_id": r.strategy_id,
            "symbol": r.symbol,
            "timeframe": r.timeframe,
            "start_ts": r.start_ts,
            "end_ts": r.end_ts,
            "final_balance": str(r.final_balance),
            "total_return_pct": float(r.total_return_pct) if r.total_return_pct else None,
            "total_trades": r.total_trades,
            "win_rate_pct": float(r.win_rate_pct) if r.win_rate_pct else None,
        }
        for r in runs
    ]
    return {"runs": items}
