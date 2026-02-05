"""Health check - for load balancers and Docker."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def health() -> dict[str, str]:
    return {"durum": "ok", "servis": "zenithai-api"}


@router.get("/live")
async def liveness() -> dict[str, str]:
    return {"durum": "canlı"}
