"""API route handlers."""

from app.api.v1.routers.auth import auth_router
from app.api.v1.routers.health import health_router

__all__ = ["health_router", "auth_router"]
