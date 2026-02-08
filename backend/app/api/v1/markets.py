"""Markets: symbols, OHLCV, indicators, patterns, ticker, orderbook, trades."""
from fastapi import APIRouter, Query

from app.services.indicators.calculator import compute_all
from app.services.market_data import service as market_service
from app.services.patterns.candle_detector import detect_patterns

router = APIRouter()


@router.get("/symbols")
async def list_symbols(
    exchange: str = Query("binance", description="Borsa: binance, bybit vb."),
) -> dict:
    return await market_service.get_symbols(exchange)


@router.get("/ohlcv")
async def get_ohlcv(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    limit: int = Query(100, le=1000),
) -> dict:
    return await market_service.get_ohlcv(exchange, symbol, timeframe, limit)


@router.get("/indicators")
async def get_indicators(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    limit: int = Query(100, le=500),
) -> dict:
    data = await market_service.get_ohlcv(exchange, symbol, timeframe, limit)
    candles = data.get("candles") or []
    indicators = compute_all(candles)
    patterns = detect_patterns(candles)
    return {
        "exchange": data.get("exchange"),
        "symbol": data.get("symbol"),
        "timeframe": data.get("timeframe"),
        "candles": candles,
        "indicators": indicators,
        "patterns": patterns,
    }


@router.get("/ticker")
async def get_ticker(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
) -> dict:
    return await market_service.get_ticker(exchange, symbol)


@router.get("/orderbook")
async def get_orderbook(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    limit: int = Query(20, ge=5, le=50),
) -> dict:
    return await market_service.get_order_book(exchange, symbol, limit)


@router.get("/trades")
async def get_trades(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    return await market_service.get_trades(exchange, symbol, limit)
