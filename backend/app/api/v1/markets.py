"""Markets: live data, symbols, OHLCV, indicators - delegates to market_data + indicators."""
from fastapi import APIRouter, Query

from app.services.indicators.calculator import compute_all
from app.services.market_data import service as market_service

router = APIRouter()


@router.get("/symbols")
async def list_symbols(
    exchange: str = Query("binance", description="Borsa: binance, bybit vb."),
) -> dict:
    """Borsadaki işlem çiftlerini listeler."""
    return await market_service.get_symbols(exchange)


@router.get("/ohlcv")
async def get_ohlcv(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    limit: int = Query(100, le=1000),
) -> dict:
    """OHLCV mum verisi (borsa veya önbellekten)."""
    return await market_service.get_ohlcv(exchange, symbol, timeframe, limit)


@router.get("/indicators")
async def get_indicators(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    limit: int = Query(100, le=500),
) -> dict:
    """OHLCV + RSI, MACD, SMA(20), EMA(20). Hafif; TA-Lib yok."""
    data = await market_service.get_ohlcv(exchange, symbol, timeframe, limit)
    candles = data.get("candles") or []
    indicators = compute_all(candles)
    return {
        "exchange": data.get("exchange"),
        "symbol": data.get("symbol"),
        "timeframe": data.get("timeframe"),
        "candles": candles,
        "indicators": indicators,
    }


@router.get("/ticker")
async def get_ticker(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
) -> dict:
    """Anlık fiyat (son fiyat, 24s değişim, hacim)."""
    return await market_service.get_ticker(exchange, symbol)


@router.get("/orderbook")
async def get_orderbook(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    limit: int = Query(20, ge=5, le=50),
) -> dict:
    """Emir defteri (alış/satış fiyat ve miktar)."""
    return await market_service.get_order_book(exchange, symbol, limit)


@router.get("/trades")
async def get_trades(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """Son işlemler (piyasa alım satım)."""
    return await market_service.get_trades(exchange, symbol, limit)
