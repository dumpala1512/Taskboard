"""Application Configuration Module using Pydantic Settings v2.

Loads all URLs, database credentials, security keys, and SMTP settings from environment (.env).
"""

from functools import lru_cache
import json
from typing import Any, List, Literal, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # 1. Application Settings
    APP_NAME: str = "Task Board API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 2. Connection URLs (configured in .env)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/taskboard_db",
        description="Async PostgreSQL connection string",
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="Frontend application base URL",
    )

    # 3. Database & Cache Pool Settings
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: float = 30.0
    REDIS_TIMEOUT: float = 5.0

    # 4. Security & JWT Secrets (configured in .env)
    JWT_SECRET: str = Field(
        default="supersecret-jwt-key-replace-with-secure-random-in-production-min-32-chars",
        min_length=32,
        description="Secret key for JWT generation and validation",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 5. CORS Allowed Origins (configured in .env)
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # 6. Email Settings (Resend HTTPS API)
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM: str = "Taskboard Support <onboarding@resend.dev>"
    INVITATION_TOKEN_EXPIRE_HOURS: int = 48

    # --- Clean Validators ---
    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Ensure PostgreSQL connection strings use the asyncpg driver."""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        """Support JSON arrays or comma-separated strings for CORS origins."""
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [origin.strip() for origin in v_trimmed.split(",") if origin.strip()]
        return v


@lru_cache()
def get_settings() -> Settings:
    """Retrieve cached instance of application settings."""
    return Settings()
