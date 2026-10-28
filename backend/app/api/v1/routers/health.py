"""Health Check Endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import get_settings
from app.schemas.health import HealthResponse

settings = get_settings()

health_router = APIRouter(tags=["Health"])


@health_router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Liveness and health check endpoint verifying the HTTP service is operational.",
)
async def health_check() -> HealthResponse:
    """Return application operational health status."""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
