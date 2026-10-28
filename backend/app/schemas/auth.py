"""Authentication and User Pydantic v2 schemas."""

from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials payload for user authentication."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., description="User's registered email address", examples=["user@example.com"])
    password: str = Field(..., min_length=1, description="Plain text account password")


class RefreshTokenRequest(BaseModel):
    """Payload to exchange an existing refresh token for a new access token."""

    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(..., min_length=1, description="Active JWT refresh token string")


class LogoutRequest(BaseModel):
    """Optional payload to revoke a refresh token session on logout."""

    model_config = ConfigDict(extra="ignore")

    refresh_token: Optional[str] = Field(default=None, description="Optional active refresh token to revoke")


class UserResponse(BaseModel):
    """Public profile schema for authenticated users."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="Unique UUID identifier of user")
    full_name: str = Field(..., description="User's full legal or display name")
    email: str = Field(..., description="User's primary contact email")
    role: str = Field(..., description="User access control role (admin or member)")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Account last updated timestamp")


class TokenResponse(BaseModel):
    """Standardized JWT token issuance payload."""

    model_config = ConfigDict(extra="ignore")

    access_token: str = Field(..., description="Short-lived signed JWT bearer access token")
    refresh_token: str = Field(..., description="Long-lived signed JWT refresh token")
    token_type: str = Field(default="bearer", description="Token authorization type")
    expires_in: int = Field(..., description="Access token expiration validity in seconds")


class LoginResponse(BaseModel):
    """Successful login outcome schema providing JWT access and refresh tokens with expiration."""

    model_config = ConfigDict(extra="ignore")

    access_token: str = Field(..., description="Short-lived signed JWT bearer access token")
    refresh_token: str = Field(..., description="Long-lived signed JWT refresh token")
    token_type: str = Field(default="bearer", description="Token authorization type")
    access_token_expires_in: int = Field(..., description="Access token expiration validity in seconds")
    refresh_token_expires_in: int = Field(..., description="Refresh token expiration validity in seconds")


class SetupPasswordRequest(BaseModel):
    """Payload submitted by user to activate account and set initial permanent password."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    token: str = Field(..., min_length=1, description="One-time invitation/setup token")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        alias="newPassword",
        description="New permanent account password",
    )


class ForgotPasswordRequest(BaseModel):
    """Payload to initiate password reset via email."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., description="Registered user email address")


class ResetPasswordRequest(BaseModel):
    """Payload to reset password using token received via email."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    token: str = Field(..., min_length=1, description="Password reset verification token")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New account password",
    )


