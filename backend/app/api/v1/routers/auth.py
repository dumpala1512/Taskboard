"""Authentication Router."""

from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Body, Depends, Header, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import bearer_scheme, get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SetupPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import SuccessResponse
from app.services.admin_service import AdminUserService
from app.services.auth_service import AuthenticationService

auth_router = APIRouter(tags=["Authentication"])


@auth_router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate User",
    description="Validate email/password credentials, issue JWT access/refresh tokens, and establish a Redis session.",
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Validate credentials and return access/refresh tokens along with expiration details."""
    service = AuthenticationService(db)
    return await service.login(login_data)


@auth_router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Access Token",
    description="Exchange a valid refresh token for a newly rotated access token and refresh token.",
)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Validate refresh token against Redis session store and issue a rotated token pair."""
    service = AuthenticationService(db)
    return await service.refresh_access_token(refresh_data.refresh_token)


@auth_router.post(
    "/logout",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke Session",
    description="Invalidate active user refresh session and blacklist access token in Redis.",
)
async def logout(
    payload: Optional[LogoutRequest] = None,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Remove user's active refresh session and blacklist access token in Redis."""
    service = AuthenticationService(db)
    refresh_token = payload.refresh_token if payload else None
    access_token = auth.credentials if auth else None
    await service.logout(
        user_id=str(current_user.id),
        refresh_token=refresh_token,
        access_token=access_token,
    )
    return SuccessResponse(success=True, message="Successfully logged out")


@auth_router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Current User Profile",
    description="Fetch profile information for the authenticated user.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the currently authenticated user's details."""
    return UserResponse.model_validate(current_user)


@auth_router.post(
    "/setup-password",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate Account via Invitation Token",
    description="Validate one-time invitation token emailed to user and set their permanent password.",
)
async def setup_password(
    payload: SetupPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Activate account using token and set initial permanent password."""
    service = AdminUserService(db)
    result = await service.setup_invited_password(payload.token, payload.password)
    return SuccessResponse(success=True, message=result["message"])


@auth_router.post(
    "/forgot-password",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Password Reset",
    description="Send secure password reset link to user's email if the account exists.",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Generate reset token and dispatch password reset instructions to user's email."""
    service = AuthenticationService(db)
    result = await service.request_password_reset(
        email=payload.email,
        background_tasks=background_tasks,
    )
    return SuccessResponse(success=True, message=result["message"])


@auth_router.post(
    "/reset-password",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset Password",
    description="Validate password reset token and update account with new permanent password.",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Update password with verified reset token and revoke previous sessions."""
    service = AuthenticationService(db)
    result = await service.reset_password(
        token=payload.token,
        new_password=payload.password,
    )
    return SuccessResponse(success=True, message=result["message"])


