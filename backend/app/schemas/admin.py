"""Admin schemas for user management and account provisioning."""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.schemas.auth import UserResponse


class CreateUserRequest(BaseModel):
    """Payload sent by administrator to create/invite a new member.
    
    Accepts both camelCase (from Next.js frontend) and snake_case attributes.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )

    full_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        alias="fullName",
        description="Full name of the user",
    )
    email: EmailStr = Field(
        ...,
        description="Primary email address",
    )
    role: str = Field(
        default="MEMBER",
        description="Assigned role (ADMIN or MEMBER)",
    )


class CreateUserResponse(BaseModel):
    """Response returned when an admin creates a new user.
    
    Conforms to prompt.md specification (success, message, data).
    """

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Success status")
    message: str = Field(
        default="User created successfully.",
        description="Human-readable success message",
    )
    data: UserResponse = Field(..., description="Created user details")
    temporaryPassword: str = Field(
        default="Sent directly to member's email address",
        description="Status message indicating credentials/invitation was emailed directly",
    )
    dev_invitation_token: Optional[str] = Field(
        default=None,
        description="Only populated in development/debug mode for convenient backend testing",
    )


class UpdateUserRequest(BaseModel):
    """Payload to update an existing user's information or role."""

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )

    full_name: Optional[str] = Field(
        default=None,
        alias="name",
        min_length=1,
        max_length=100,
        description="Updated full name",
    )
    email: Optional[EmailStr] = Field(
        default=None,
        description="Updated email address",
    )
    role: Optional[str] = Field(
        default=None,
        description="Updated role (ADMIN or MEMBER)",
    )


class AdminUserDetail(BaseModel):
    """Individual user details for admin lists and responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="User unique identifier")
    full_name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email address")
    role: str = Field(..., description="User's role (ADMIN or MEMBER)")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class AdminUsersListResponse(BaseModel):
    """Standard response envelope for GET /admin/users."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Success status")
    message: str = Field(default="Users retrieved successfully.", description="Status message")
    data: List[AdminUserDetail] = Field(..., description="List of all registered users")


class AdminUserUpdateResponse(BaseModel):
    """Standard response envelope for PATCH /admin/users/{user_id}."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Success status")
    message: str = Field(default="User updated successfully.", description="Status message")
    data: AdminUserDetail = Field(..., description="Updated user details")
