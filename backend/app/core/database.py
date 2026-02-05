"""Async database session and engine - dependency injection friendly."""
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.core.base import Base

_settings = get_settings()
engine = create_async_engine(
    _settings.database_url,
    echo=_settings.database_echo,
)
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


DbSession = Annotated[AsyncSession, Depends(get_db)]


async def init_db() -> None:
    """Create tables (use Alembic in production). Kullanıcı/strateji modelleri eklendiğinde çağrılacak."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
