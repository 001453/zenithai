"""Zenithai FastAPI application - mounts modular routers."""
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.api.v1.router import api_router
from app.core.database import init_db
from app.scheduler import scheduler_loop
import app.models  # noqa: F401 - register all ORM models for create_all

_scheduler_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: init DB, start strategy scheduler. Shutdown: cancel scheduler."""
    await init_db()
    global _scheduler_task
    _scheduler_task = asyncio.create_task(scheduler_loop())
    yield
    if _scheduler_task:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass


def create_app() -> FastAPI:
    settings = get_settings()
    origins = list(settings.cors_origins)
    if settings.cors_origins_extra:
        origins.extend(s.strip() for s in settings.cors_origins_extra.split(",") if s.strip())
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Kripto, forex, BIST, botlar ve makine öğrenmesi ile modüler alım satım ve analiz platformu.",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
