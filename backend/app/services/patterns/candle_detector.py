"""Mum pattern: Hammer, Doji, Engulfing."""
from typing import Any


def _row(candles: list[list], i: int) -> tuple[float, float, float, float]:
    if i < 0 or i >= len(candles):
        return (0.0, 0.0, 0.0, 0.0)
    c = candles[i]
    return (float(c[1]), float(c[2]), float(c[3]), float(c[4])) if len(c) >= 5 else (0.0, 0.0, 0.0, 0.0)


def is_hammer(candles: list[list], i: int) -> bool:
    o, h, lo, c = _row(candles, i)
    full = h - lo
    if full <= 0:
        return False
    body, lower = abs(c - o), min(o, c) - lo
    return body / full <= 0.4 and lower / (body + 1e-8) >= 2.0 and (h - max(o, c)) <= body * 0.5


def is_doji(candles: list[list], i: int) -> bool:
    o, h, lo, c = _row(candles, i)
    return (h - lo) > 0 and abs(c - o) / (h - lo) <= 0.1


def is_bullish_engulfing(candles: list[list], i: int) -> bool:
    if i < 1:
        return False
    o0, _, _, c0 = _row(candles, i - 1)
    o1, _, _, c1 = _row(candles, i)
    return c0 < o0 and c1 > o1 and o1 <= c0 and c1 >= o0


def is_bearish_engulfing(candles: list[list], i: int) -> bool:
    if i < 1:
        return False
    o0, _, _, c0 = _row(candles, i - 1)
    o1, _, _, c1 = _row(candles, i)
    return c0 > o0 and c1 < o1 and o1 >= c0 and c1 <= o0


def detect_patterns(candles: list[list]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not candles or len(candles) < 2:
        return out
    for i in range(len(candles)):
        if is_hammer(candles, i):
            out.append({"index": i, "name": "hammer", "type": "bullish"})
        if is_doji(candles, i):
            out.append({"index": i, "name": "doji", "type": "neutral"})
        if is_bullish_engulfing(candles, i):
            out.append({"index": i, "name": "bullish_engulfing", "type": "bullish"})
        if is_bearish_engulfing(candles, i):
            out.append({"index": i, "name": "bearish_engulfing", "type": "bearish"})
    return out
