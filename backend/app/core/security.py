"""Security and Authentication Foundation.

Contains token constants and security helpers.
Business authentication and authorization logic will be added in subsequent phases.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from app.core.config import get_settings

settings = get_settings()


def get_token_expiration(minutes: Optional[int] = None) -> datetime:
    """Calculate expiration timestamp for tokens."""
    expire_minutes = minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    return datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)


def get_refresh_token_expiration(days: Optional[int] = None) -> datetime:
    """Calculate expiration timestamp for refresh tokens."""
    expire_days = days or settings.REFRESH_TOKEN_EXPIRE_DAYS
    return datetime.now(timezone.utc) + timedelta(days=expire_days)
