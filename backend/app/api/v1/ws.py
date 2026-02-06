"""WebSocket: canlı ticker ve OHLCV akışı (Türkçe)."""
import asyncio
import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.services.market_data import service as market_service

router = APIRouter()


@router.websocket("/ticker")
async def ws_ticker(
    websocket: WebSocket,
    symbol: str = Query("BTC/USDT"),
    exchange: str = Query("binance"),
    interval_sec: float = Query(2.0, ge=1.0, le=60.0),
) -> None:
    """Tek sembol için canlı ticker; her interval_sec saniyede güncel fiyat gönderir."""
    await websocket.accept()
    try:
        while True:
            try:
                data = await market_service.get_ticker(exchange, symbol)
                await websocket.send_text(json.dumps(data))
            except RuntimeError:
                break  # Bağlantı kapatıldı, send artık çalışmaz
            except Exception as e:
                try:
                    await websocket.send_text(
                        json.dumps({"hata": str(e), "sembol": symbol})
                    )
                except RuntimeError:
                    break
            await asyncio.sleep(interval_sec)
    except WebSocketDisconnect:
        pass


@router.websocket("/ohlcv")
async def ws_ohlcv(
    websocket: WebSocket,
    symbol: str = Query("BTC/USDT"),
    exchange: str = Query("binance"),
    timeframe: str = Query("1h"),
    limit: int = Query(100, ge=10, le=500),
    interval_sec: float = Query(30.0, ge=5.0, le=300.0),
) -> None:
    """Grafik için OHLCV mum verisi; her interval_sec saniyede güncel mum listesini gönderir."""
    await websocket.accept()
    try:
        while True:
            try:
                data = await market_service.get_ohlcv(
                    exchange, symbol, timeframe, limit
                )
                await websocket.send_text(json.dumps(data))
            except RuntimeError:
                break  # Bağlantı kapatıldı
            except Exception as e:
                try:
                    await websocket.send_text(
                        json.dumps({"hata": str(e), "sembol": symbol})
                    )
                except RuntimeError:
                    break
            await asyncio.sleep(interval_sec)
    except WebSocketDisconnect:
        pass
