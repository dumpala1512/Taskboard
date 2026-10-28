"""Admin Router for member administration and account provisioning."""

from typing import List
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.admin import (
    AdminUserDetail,
    AdminUsersListResponse,
    AdminUserUpdateResponse,
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserRequest,
)
from app.services.admin_service import AdminUserService

admin_router = APIRouter(tags=["Admin"])


@admin_router.get(
    "/users",
    response_model=AdminUsersListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get All Users",
    description="Retrieves all registered users. Restricted to administrators only.",
)
async def get_all_users(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUsersListResponse:
    """Retrieve all users in the workspace."""
    service = AdminUserService(db)
    users = await service.get_all_users()
    data = [AdminUserDetail.model_validate(u) for u in users]
    return AdminUsersListResponse(success=True, message="Users retrieved successfully.", data=data)


@admin_router.post(
    "/users",
    response_model=CreateUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User (Direct Email Invitation)",
    description="Provision a new user account, omit raw temporary passwords, and dispatch an invitation email directly to the user.",
)
async def create_user(
    payload: CreateUserRequest,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CreateUserResponse:
    """Create member account and asynchronously dispatch welcome invitation email."""
    service = AdminUserService(db)
    return await service.create_user_and_invite(payload, background_tasks)


@admin_router.patch(
    "/users/{user_id}",
    response_model=AdminUserUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User",
    description="Updates a user's information or role. Restricted to administrators only.",
)
async def update_user(
    user_id: uuid.UUID,
    payload: UpdateUserRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserUpdateResponse:
    """Update user information or access role."""
    service = AdminUserService(db)
    updated_user = await service.update_user(user_id=user_id, data=payload)
    return AdminUserUpdateResponse(
        success=True,
        message="User updated successfully.",
        data=AdminUserDetail.model_validate(updated_user),
    )


@admin_router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete User",
    description="Deletes a user account. Restricted to administrators only.",
)
async def delete_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a user account by UUID. Returns 204 No Content."""
    service = AdminUserService(db)
    await service.delete_user(user_id=user_id, current_admin=current_admin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
