"""Risk limitleri: listele, oluştur, güncelle, sil (Türkçe)."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.database import DbSession
from app.core.deps import CurrentUser
from app.models.risk_limits import RiskLimit
from sqlalchemy import select

router = APIRouter()


class RiskLimitOlustur(BaseModel):
    strategy_id: int | None = None
    max_position_size: Decimal | None = None
    daily_loss_limit: Decimal | None = None


class RiskLimitGuncelle(BaseModel):
    strategy_id: int | None = None
    max_position_size: Decimal | None = None
    daily_loss_limit: Decimal | None = None


@router.get("", summary="Risk limitlerini listele")
async def listele(db: DbSession, current_user: CurrentUser) -> dict:
    """Kullanıcının risk limit kayıtlarını döner."""
    result = await db.execute(
        select(RiskLimit).where(RiskLimit.user_id == current_user.id)
    )
    kayitlar = result.scalars().all()
    return {
        "limitler": [
            {
                "id": r.id,
                "strateji_id": r.strategy_id,
                "maksimum_pozisyon": str(r.max_position_size) if r.max_position_size else None,
                "gunluk_zarar_limiti": str(r.daily_loss_limit) if r.daily_loss_limit else None,
            }
            for r in kayitlar
        ]
    }


@router.post("", summary="Risk limiti ekle")
async def olustur(
    body: RiskLimitOlustur,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Yeni risk limiti kaydı oluşturur."""
    limit = RiskLimit(
        user_id=current_user.id,
        strategy_id=body.strategy_id,
        max_position_size=body.max_position_size,
        daily_loss_limit=body.daily_loss_limit,
    )
    db.add(limit)
    await db.flush()
    return {"mesaj": "Risk limiti eklendi.", "id": limit.id}


@router.patch("/{limit_id}", summary="Risk limiti güncelle")
async def guncelle(
    limit_id: int,
    body: RiskLimitGuncelle,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Mevcut risk limitini günceller."""
    limit = await db.get(RiskLimit, limit_id)
    if not limit or limit.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk limiti bulunamadı")
    if body.strategy_id is not None:
        limit.strategy_id = body.strategy_id
    if body.max_position_size is not None:
        limit.max_position_size = body.max_position_size
    if body.daily_loss_limit is not None:
        limit.daily_loss_limit = body.daily_loss_limit
    await db.flush()
    return {
        "ok": True,
        "mesaj": "Risk limiti güncellendi.",
        "id": limit.id,
        "strateji_id": limit.strategy_id,
        "maksimum_pozisyon": str(limit.max_position_size) if limit.max_position_size else None,
        "gunluk_zarar_limiti": str(limit.daily_loss_limit) if limit.daily_loss_limit else None,
    }


@router.delete("/{limit_id}", summary="Risk limiti sil")
async def sil(
    limit_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> dict:
    """Risk limiti kaydını siler."""
    limit = await db.get(RiskLimit, limit_id)
    if not limit or limit.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk limiti bulunamadı")
    await db.delete(limit)
    await db.flush()
    return {"ok": True, "mesaj": "Risk limiti silindi."}
