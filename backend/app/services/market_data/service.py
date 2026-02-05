"""Market data: ccxt (kripto) + Twelve Data (forex/altın)."""
from typing import Any

from app.services.market_data import providers as prov


def _get_exchange(exchange_id: str):
    import ccxt.async_support as ccxt
    if exchange_id == "binance":
        return ccxt.binance({"enableRateLimit": True})
    if exchange_id == "bybit":
        return ccxt.bybit({"enableRateLimit": True})
    raise ValueError(f"Desteklenmeyen borsa: {exchange_id}")


async def get_symbols(exchange_id: str) -> dict[str, Any]:
    if exchange_id == "twelvedata":
        return await prov.twelvedata.get_symbols_twelvedata()
    ex = _get_exchange(exchange_id)
    try:
        await ex.load_markets()
        symbols = list(ex.symbols)[:100]
        return {"exchange": exchange_id, "symbols": symbols}
    finally:
        await ex.close()


async def get_ohlcv(
    exchange_id: str,
    symbol: str,
    timeframe: str = "1h",
    limit: int = 100,
) -> dict[str, Any]:
    if exchange_id == "twelvedata":
        return await prov.twelvedata.get_ohlcv_twelvedata(symbol, timeframe, limit)
    ex = _get_exchange(exchange_id)
    try:
        ohlcv = await ex.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
        return {
            "exchange": exchange_id,
            "symbol": symbol,
            "timeframe": timeframe,
            "candles": ohlcv,
        }
    finally:
        await ex.close()


async def get_ticker(exchange_id: str, symbol: str) -> dict[str, Any]:
    if exchange_id == "twelvedata":
        return await prov.twelvedata.get_ticker_twelvedata(symbol)
    ex = _get_exchange(exchange_id)
    try:
        ticker = await ex.fetch_ticker(symbol)
        return {
            "symbol": ticker["symbol"],
            "last": ticker.get("last"),
            "bid": ticker.get("bid"),
            "ask": ticker.get("ask"),
            "volume": ticker.get("baseVolume"),
            "change_24h": ticker.get("percentage"),
        }
    finally:
        await ex.close()
