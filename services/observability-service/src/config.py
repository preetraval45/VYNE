from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str = "postgresql://vyne:vyne@localhost:5432/vyne"
    jwt_secret: str = "dev-secret-change-in-production"
    aws_region: str = "us-east-1"
    cors_origins: List[str] = ["http://localhost:3000"]
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
