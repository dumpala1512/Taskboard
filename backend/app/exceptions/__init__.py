"""Application exceptions and global exception handlers."""

from app.exceptions.handlers import (
    AppException,
    DatabaseUnavailableException,
    EntityNotFoundException,
    ExpiredTokenException,
    ForbiddenException,
    InvalidCredentialsException,
    InvalidTokenException,
    RedisUnavailableException,
    RefreshTokenNotFoundException,
    UnauthorizedException,
    register_exception_handlers,
)

__all__ = [
    "AppException",
    "InvalidCredentialsException",
    "ExpiredTokenException",
    "InvalidTokenException",
    "RefreshTokenNotFoundException",
    "UnauthorizedException",
    "ForbiddenException",
    "EntityNotFoundException",
    "DatabaseUnavailableException",
    "RedisUnavailableException",
    "register_exception_handlers",
]
