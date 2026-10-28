"""Authentication and Role-Based Authorization FastAPI Dependencies."""

from typing import Annotated, Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.exceptions.handlers import ForbiddenException, UnauthorizedException
from app.models.user import User
from app.services.auth_service import AuthenticationService, token_service
from app.utils.redis import get_redis

# HTTP Bearer authentication scheme for Swagger UI
bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Enter your JWT Bearer token",
)
oauth2_scheme = bearer_scheme


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = None,
) -> User:
    """Dependency that extracts, verifies the access token, and returns the current user.

    Raises:
        UnauthorizedException (401): If no token is provided, token is expired, or user not found.
    """
    raw_token = token
    if not raw_token and isinstance(auth, HTTPAuthorizationCredentials):
        raw_token = auth.credentials
    elif not raw_token and isinstance(auth, str):
        raw_token = auth

    if not raw_token or not str(raw_token).strip():
        raise UnauthorizedException("Authentication token is missing")

    # Validate access token claims and expiry
    payload = token_service.validate_token(str(raw_token), expected_type="access")

    auth_service = AuthenticationService(db)

    # Check if token or user session has been revoked via logout
    is_revoked = await auth_service.session_service.is_token_revoked(
        user_id=payload.get("user_id"),
        token=str(raw_token),
        token_iat=payload.get("iat"),
    )
    if is_revoked:
        raise UnauthorizedException("Session has been terminated or user has logged out")

    return await auth_service.verify_current_user(payload)


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Authorization dependency ensuring the user possesses the 'admin' role.

    Raises:
        ForbiddenException (403): If the user does not possess admin authority.
    """
    if current_user.role.lower() != "admin":
        raise ForbiddenException("Administrator role is required to perform this action")
    return current_user


async def require_member(
    current_user: User = Depends(get_current_user),
) -> User:
    """Authorization dependency ensuring the user possesses an authorized role ('member' or 'admin').

    Raises:
        ForbiddenException (403): If the user role is not authorized.
    """
    if current_user.role.lower() not in ("admin", "member"):
        raise ForbiddenException("Member or Administrator role is required to access this resource")
    return current_user


# Type-annotated dependency aliases
CurrentUserDep = Annotated[User, Depends(get_current_user)]
AdminUserDep = Annotated[User, Depends(require_admin)]
MemberUserDep = Annotated[User, Depends(require_member)]
