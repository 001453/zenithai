"""Central configuration - single source of truth for env and settings."""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),  # backend/.env veya proje kökü .env
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "Zenithai"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://zenithai:zenithai@db:5432/zenithai"
    database_echo: bool = False

    # Redis (optional)
    redis_url: Optional[str] = None

    # Auth
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS (localhost + Codespaces *.app.github.dev)
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str | None = "https://.*\\.app\\.github\\.dev"  # Codespaces frontend

    # Market data providers (API keys from env)
    binance_api_key: Optional[str] = None
    binance_api_secret: Optional[str] = None
    twelve_data_api_key: Optional[str] = None  # Forex/altın (EUR/USD, XAU/USD vb.)

    # ML: eğitilmiş model dosyaları
    ml_artifact_dir: str = "data/models"


@lru_cache
def get_settings() -> Settings:
    return Settings()
