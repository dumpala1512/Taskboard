"""Task Board API Application Entrypoint.

Configures FastAPI instance, lifespan lifecycle, middleware pipeline,
global exception handling, and API routing.
"""

from contextlib import asynccontextmanager
import logging
import sys
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_v1_router
from app.api.v1.routers.health import health_router
from app.core.config import get_settings
from app.db.session import check_database_health, close_database_connection
from app.exceptions.handlers import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.utils.redis import close_redis, init_redis

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("app.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown routines."""
    logger.info("Initializing %s (v%s) [%s]...", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)

    # 1. Verify Database connectivity
    db_ok = await check_database_health()
    if db_ok:
        logger.info("Database connection established successfully.")
    else:
        logger.warning("Could not reach PostgreSQL database during startup.")

    # 2. Initialize Redis client and verify connection
    try:
        await init_redis()
    except Exception as exc:
        logger.warning("Could not initialize Redis during startup: %s", exc)

    logger.info("Application startup complete. Ready to receive requests.")
    yield

    # Application Shutdown
    logger.info("Application shutting down. Cleaning up resources...")
    await close_redis()
    await close_database_connection()
    logger.info("All resources cleaned up. Shutdown complete.")


def create_application() -> FastAPI:
    """Application factory for FastAPI."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Internal Team Task Board Production Backend API",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 1. Register Global Exception Handlers
    register_exception_handlers(app)

    # 2. Register Middleware (Order matters: outer middlewares wrap inner middlewares)
    # Logging middleware runs inside RequestId so request_id is available
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIdMiddleware)

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # 3. Mount Routers
    # Mount primary API router under /taskboard/api/v1 (No duplicates in OpenAPI/Swagger)
    app.include_router(api_v1_router)


    # Hidden fallback for root /health probes (Docker health checks)
    @app.get("/health", include_in_schema=False)
    async def root_health_probe():
        from datetime import datetime, timezone
        from app.schemas.health import HealthResponse
        return HealthResponse(
            status="ok",
            service=settings.APP_NAME,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
