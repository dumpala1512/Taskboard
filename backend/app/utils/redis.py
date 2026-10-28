"""Redis client lifecycle and session cache connection manager."""

import logging
from typing import AsyncGenerator, Optional
import redis.asyncio as aioredis
from redis.asyncio import Redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_client: Optional[Redis] = None


def get_redis_client() -> Redis:
    """Return active Redis connection instance or initialize lazily."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=settings.REDIS_TIMEOUT,
            socket_connect_timeout=settings.REDIS_TIMEOUT,
        )
    return redis_client


async def init_redis() -> Redis:
    """Initialize Redis connection and test connectivity."""
    client = get_redis_client()
    logger.info("Connecting to Redis at %s...", settings.REDIS_URL)
    await client.ping()
    logger.info("Successfully connected and pinged Redis.")
    return client


async def close_redis() -> None:
    """Close active Redis connection."""
    global redis_client
    if redis_client is not None:
        logger.info("Closing Redis connection pool...")
        try:
            await redis_client.aclose()
            logger.info("Redis connection pool closed.")
        except Exception as exc:
            logger.warning("Error while closing Redis connection: %s", exc)
        finally:
            redis_client = None


async def check_redis_health() -> bool:
    """Check Redis health by pinging."""
    try:
        client = get_redis_client()
        pong = await client.ping()
        return bool(pong)
    except Exception as exc:
        logger.warning("Redis health check failed: %s", exc)
        return False


async def get_redis() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency yielding Redis client."""
    client = get_redis_client()
    yield client
