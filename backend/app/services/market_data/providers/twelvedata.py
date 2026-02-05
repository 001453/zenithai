"""Twelve Data API: Forex ve altın (EUR/USD, XAU/USD vb.)."""
from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings

BASE_URL = "https://api.twelvedata.com"
INTERVAL_MAP = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h", "1d": "1day"}

# API key yoksa kullanılan varsayılan sembol listesi
DEFAULT_SYMBOLS = [
    "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "XAG/USD",
    "BTC/USD", "ETH/USD", "AUD/USD", "USD/CHF", "USD/CAD",
]


def _interval(s: str) -> str:
    return INTERVAL_MAP.get(s.lower(), "1h")


async def get_symbols_twelvedata() -> dict[str, Any]:
    """Twelve Data API'den forex_pairs ve commodities sembollerini çeker.
    API key yoksa varsayılan liste döner."""
    settings = get_settings()
    if not settings.twelve_data_api_key:
        return {
            "exchange": "twelvedata",
            "symbols": DEFAULT_SYMBOLS,
            "source": "default",
        }
    symbols: set[str] = set()
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Forex çiftleri
        r_forex = await client.get(
            f"{BASE_URL}/forex_pairs",
            params={"apikey": settings.twelve_data_api_key},
        )
        if r_forex.status_code == 200:
            data = r_forex.json()
            for item in (data.get("data") or []):
                s = item.get("symbol")
                if s and isinstance(s, str) and "/" in s:
                    symbols.add(s)
        # Emtialar (altın, gümüş vb. - XAU/USD, XAG/USD formatında olanlar)
        r_comm = await client.get(
            f"{BASE_URL}/commodities",
            params={"apikey": settings.twelve_data_api_key},
        )
        if r_comm.status_code == 200:
            data = r_comm.json()
            for item in (data.get("data") or []):
                s = item.get("symbol")
                if s and isinstance(s, str) and "/" in s:
                    symbols.add(s)
    result = sorted(symbols) if symbols else DEFAULT_SYMBOLS
    return {
        "exchange": "twelvedata",
        "symbols": result,
        "source": "api",
    }


async def get_ohlcv_twelvedata(symbol: str, timeframe: str, limit: int) -> dict[str, Any]:
    """Twelve Data time_series → OHLCV liste (ccxt formatına yakın: [ts_ms, o, h, l, c, vol])."""
    settings = get_settings()
    if not settings.twelve_data_api_key:
        return {"exchange": "twelvedata", "symbol": symbol, "candles": [], "hata": "API anahtarı yok."}
    interval = _interval(timeframe)
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol,
                "interval": interval,
                "outputsize": min(limit, 5000),
                "apikey": settings.twelve_data_api_key,
            },
        )
    if r.status_code != 200:
        return {"exchange": "twelvedata", "symbol": symbol, "candles": [], "hata": r.text}
    data = r.json()
    values = data.get("values") or []
    candles: list[list] = []
    for v in reversed(values):
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(v["datetime"].replace("Z", "+00:00"))
            ts_ms = int(dt.timestamp() * 1000)
            o, h, l, c = float(v["open"]), float(v["high"]), float(v["low"]), float(v["close"])
            vol = float(v.get("volume", 0))
            candles.append([ts_ms, o, h, l, c, vol])
        except (KeyError, ValueError):
            continue
    return {"exchange": "twelvedata", "symbol": symbol, "timeframe": timeframe, "candles": candles}


async def get_ticker_twelvedata(symbol: str) -> dict[str, Any]:
    """Twelve Data quote → son fiyat, değişim."""
    settings = get_settings()
    if not settings.twelve_data_api_key:
        return {"symbol": symbol, "last": None, "change_24h": None, "hata": "API anahtarı yok."}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            f"{BASE_URL}/quote",
            params={"symbol": symbol, "apikey": settings.twelve_data_api_key},
        )
    if r.status_code != 200:
        return {"symbol": symbol, "last": None, "change_24h": None, "hata": r.text}
    data = r.json()
    if isinstance(data, dict) and "quotes" in data:
        q = (data["quotes"] or [{}])[0]
    elif isinstance(data, dict):
        q = data
    else:
        q = {}
    try:
        last = float(q.get("close", 0) or q.get("price", 0) or 0)
        change = float(q.get("percent_change", 0) or q.get("change_percent", 0) or 0)
        vol = float(q.get("volume", 0) or 0)
        return {"symbol": symbol, "last": last, "change_24h": change, "volume": vol}
    except (TypeError, ValueError):
        return {"symbol": symbol, "last": None, "change_24h": None}
