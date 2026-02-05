"""Aggregates all v1 API routers - single include_router point."""
from fastapi import APIRouter

from app.api.v1 import auth, backtest, health, markets, ml, orders, risk, strategies, ws

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(markets.router, prefix="/markets", tags=["markets"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
api_router.include_router(ml.router, prefix="/ml", tags=["ml"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(ws.router, prefix="/ws", tags=["ws"])
