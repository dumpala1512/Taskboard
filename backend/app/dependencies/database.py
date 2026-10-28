"""Database and Cache Dependency Injection Providers."""

from typing import Annotated, AsyncGenerator
from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.utils.redis import get_redis

# Type-annotated dependencies for FastAPI route handlers
DBSessionDep = Annotated[AsyncSession, Depends(get_db)]
RedisDep = Annotated[Redis, Depends(get_redis)]

__all__ = ["get_db", "get_redis", "DBSessionDep", "RedisDep"]
