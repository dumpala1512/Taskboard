"""Global Exception Handlers and Standardized Error Responses."""

import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception for domain errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "BAD_REQUEST",
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


# Authentication & Authorization Specific Exceptions
class InvalidCredentialsException(AppException):
    """Raised when email or password verification fails."""

    def __init__(self, message: str = "Invalid email or password") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
        )


class ExpiredTokenException(AppException):
    """Raised when a provided JWT token has expired."""

    def __init__(self, message: str = "Token has expired") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="EXPIRED_TOKEN",
        )


class InvalidTokenException(AppException):
    """Raised when a provided JWT token is malformed or signature fails."""

    def __init__(self, message: str = "Invalid token") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN",
        )


class RefreshTokenNotFoundException(AppException):
    """Raised when a refresh token cannot be located in Redis or was revoked."""

    def __init__(self, message: str = "Refresh token is invalid or has been revoked") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="REFRESH_TOKEN_NOT_FOUND",
        )


class UnauthorizedException(AppException):
    """Raised when an unauthenticated request attempts to access a protected resource."""

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
        )


class ForbiddenException(AppException):
    """Raised when an authenticated user does not have sufficient role permissions."""

    def __init__(self, message: str = "You do not have permission to access this resource") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
        )


class UserAlreadyAssignedException(AppException):
    """Raised when attempting to assign a user to a project they are already assigned to."""

    def __init__(self, message: str = "User is already assigned to this project.", details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            code="USER_ALREADY_ASSIGNED",
            details=details,
        )


class EntityNotFoundException(AppException):
    """Raised when an entity is not found."""

    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            details=details,
        )


class DatabaseUnavailableException(AppException):
    """Raised when database operations fail or connectivity is lost."""

    def __init__(self, message: str = "Database service is unavailable") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="DATABASE_UNAVAILABLE",
        )


class RedisUnavailableException(AppException):
    """Raised when Redis operations fail or connectivity is lost."""

    def __init__(self, message: str = "Redis cache service is unavailable") -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="REDIS_UNAVAILABLE",
        )


def _format_error_response(
    request: Request,
    code: str,
    message: str,
    details: Optional[Any] = None,
    error: Optional[Any] = None,
) -> Dict[str, Any]:
    """Format standardized ErrorResponse compliant payload."""
    req_id = getattr(request.state, "request_id", None)
    payload: Dict[str, Any] = {
        "success": False,
        "error": error if error is not None else code,
        "message": message,
        "code": code if isinstance(code, str) else (code.get("code") if isinstance(code, dict) else str(code)),
        "request_id": req_id,
        "details": details,
    }
    return payload


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    logger.warning("Application exception [%s]: %s", exc.code, exc.message)
    headers = {}
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        headers["WWW-Authenticate"] = "Bearer"

    error_field = exc.details.get("error") if isinstance(exc.details, dict) and "error" in exc.details else None

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content=_format_error_response(
            request=request,
            code=exc.code,
            message=exc.message,
            details=exc.details,
            error=error_field,
        ),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle Starlette / FastAPI HTTPExceptions."""
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    headers = exc.headers or {}
    message = str(exc.detail)
    error_field = None
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", code)
        message = exc.detail.get("message", message)
        if "error" in exc.detail:
            error_field = exc.detail["error"]
    elif "X-Error-Code" in headers:
        code = headers["X-Error-Code"]

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content=_format_error_response(
            request=request,
            code=code,
            message=message,
            error=error_field,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle FastAPI / Pydantic request validation errors using ValidationErrorResponse format."""
    req_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation Error",
            "message": "Request validation failed",
            "request_id": req_id,
            "details": jsonable_encoder(exc.errors()),
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled server exceptions."""
    req_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled server exception [%s]: %s", req_id, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_format_error_response(
            request=request,
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please contact support with the request ID.",
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI application instance."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
