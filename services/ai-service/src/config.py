from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    database_url: str = "postgresql://vyne:vyne@localhost:5432/vyne"
    jwt_secret: str = "dev-secret-change-in-production"
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_embed_model_id: str = "amazon.titan-embed-text-v2:0"
    cors_origins: List[str] = ["http://localhost:3000"]
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
