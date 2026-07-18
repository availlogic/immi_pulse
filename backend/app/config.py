"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "sqlite+aiosqlite:///./immipulse.db"
    DASHBOARD_API_TOKEN: str = "generate_a_secure_random_token"
    NEWS_RETENTION_DAYS: int = 14
    CORS_ORIGINS: str = "*"

    model_config = {"env_prefix": "", "case_sensitive": True}


settings = Settings()
