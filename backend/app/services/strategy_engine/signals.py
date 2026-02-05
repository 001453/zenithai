"""Strateji sinyalleri: MA cross, RSI vb. (saf fonksiyonlar)."""
from typing import Any

import json


def _compute_rsi(closes: list[float], period: int = 14) -> float | None:
    """RSI hesaplar. En az period+1 close gerekir."""
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(-period, 0):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def rsi_signal(candles: list[list], params: dict[str, Any]) -> str | None:
    """RSI oversold/overbought. Returns 'buy' | 'sell' | None."""
    if not candles or len(candles) < 2:
        return None
    closes = [float(c[4]) for c in candles]
    period = int(params.get("rsi_period", 14))
    oversold = float(params.get("oversold", 30))
    overbought = float(params.get("overbought", 70))
    rsi = _compute_rsi(closes, period)
    if rsi is None:
        return None
    if rsi <= oversold:
        return "buy"
    if rsi >= overbought:
        return "sell"
    return None


def ma_cross_signal(candles: list[list], params: dict[str, Any]) -> str | None:
    """OHLCV candles (son eleman en güncel). Returns 'buy' | 'sell' | None."""
    if not candles or len(candles) < 2:
        return None
    closes = [c[4] for c in candles]
    short_period = int(params.get("short_period", 10))
    long_period = int(params.get("long_period", 20))
    if len(closes) < long_period:
        return None
    short_ma = sum(closes[-short_period:]) / short_period
    long_ma = sum(closes[-long_period:]) / long_period
    prev_short = sum(closes[-short_period - 1 : -1]) / short_period
    prev_long = sum(closes[-long_period - 1 : -1]) / long_period
    if prev_short <= prev_long and short_ma > long_ma:
        return "buy"
    if prev_short >= prev_long and short_ma < long_ma:
        return "sell"
    return None


def get_signal(strategy_type: str, candles: list[list], params_json: str) -> str | None:
    """Strateji tipine göre sinyal döner."""
    params = json.loads(params_json) if params_json else {}
    if strategy_type == "ma_cross":
        return ma_cross_signal(candles, params)
    if strategy_type == "rsi":
        return rsi_signal(candles, params)
    return None
