from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Vercel injects POSTGRES_URL automatically when Neon is connected.
    # Falls back to DATABASE_URL, then a local dev default.
    database_url: str = (
        os.environ.get("POSTGRES_URL")
        or os.environ.get("DATABASE_URL")
        or "postgresql://vyne:vyne@localhost:5432/vyne"
    )

    jwt_secret: str = "dev-secret-change-in-production"

    # Anthropic (direct) — preferred on Vercel. Set ANTHROPIC_API_KEY in dashboard.
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    anthropic_model_id: str = "claude-opus-4-6"

    # Redis — Vercel injects KV_REST_API_URL + KV_REST_API_TOKEN when Redis is connected.
    redis_url: str = os.environ.get("KV_REST_API_URL", "")
    redis_token: str = os.environ.get("KV_REST_API_TOKEN", "")

    # Blob — Vercel injects BLOB_READ_WRITE_TOKEN when Blob is connected.
    blob_token: str = os.environ.get("BLOB_READ_WRITE_TOKEN", "")

    cors_origins: List[str] = [
        "http://localhost:3000",
        "https://vyne.vercel.app",
    ]
    environment: str = os.environ.get("ENVIRONMENT", "development")

    class Config:
        env_file = ".env"


settings = Settings()
