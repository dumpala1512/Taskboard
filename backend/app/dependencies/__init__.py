"""Dependency injection providers for FastAPI."""

from app.db.session import get_db
from app.dependencies.auth import (
    AdminUserDep,
    CurrentUserDep,
    MemberUserDep,
    bearer_scheme,
    get_current_user,
    oauth2_scheme,
    require_admin,
    require_member,
)
from app.dependencies.database import DBSessionDep, RedisDep
from app.utils.redis import get_redis

__all__ = [
    "get_db",
    "get_redis",
    "bearer_scheme",
    "get_current_user",
    "require_admin",
    "require_member",
    "oauth2_scheme",
    "DBSessionDep",
    "RedisDep",
    "CurrentUserDep",
    "AdminUserDep",
    "MemberUserDep",
]
