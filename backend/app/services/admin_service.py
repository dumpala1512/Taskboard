"""Admin user provisioning and account setup service."""

import json
import logging
import secrets
import uuid
from typing import List
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.dao.user_repository import UserRepository
from app.models.user import User
from app.schemas.admin import CreateUserRequest, CreateUserResponse, UpdateUserRequest
from app.schemas.auth import UserResponse
from app.services.auth_service import PasswordService
from app.services.email_service import EmailService
from app.utils.redis import get_redis_client

logger = logging.getLogger(__name__)
settings = get_settings()


class AdminUserService:
    """Service handling administrator user creation and invitation lifecycle."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    async def create_user_and_invite(
        self,
        data: CreateUserRequest,
        background_tasks: BackgroundTasks,
    ) -> CreateUserResponse:
        """Create a new user account, generate an activation token, and dispatch invitation email."""
        clean_email = data.email.strip().lower()

        # 1. Verify email uniqueness
        if await self.user_repo.exists_by_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )

        # 2. Normalize role
        assigned_role = data.role.strip().lower() if data.role else "member"
        if assigned_role not in ["admin", "member"]:
            assigned_role = "member"

        # 3. Create user record with a randomized locked password hash
        initial_random_secret = secrets.token_hex(24)
        initial_hash = PasswordService.hash_password(initial_random_secret)

        new_user = User(
            full_name=data.full_name.strip(),
            email=clean_email,
            role=assigned_role,
            password_hash=initial_hash,
        )
        created_user = await self.user_repo.create(new_user)
        logger.info(
            "Created new user '%s' (%s) with role '%s'",
            created_user.full_name,
            created_user.email,
            created_user.role,
        )

        # 4. Generate one-time activation token and store in Redis
        invitation_token = secrets.token_urlsafe(32)
        redis_client = get_redis_client()
        if redis_client:
            redis_key = f"invite_token:{invitation_token}"
            payload = json.dumps({
                "user_id": str(created_user.id),
                "email": created_user.email,
            })
            ttl_seconds = settings.INVITATION_TOKEN_EXPIRE_HOURS * 3600
            try:
                await redis_client.set(redis_key, payload, ex=ttl_seconds)
            except Exception as exc:
                logger.warning("Failed to cache invitation token in Redis: %s", exc)

        # 5. Dispatch onboarding invitation email in background
        background_tasks.add_task(
            EmailService.send_invitation_email,
            email=created_user.email,
            name=created_user.full_name,
            token=invitation_token,
            role=created_user.role,
        )

        # 6. Return response conforming to prompt.md without exposing passwords
        user_response = UserResponse.model_validate(created_user)
        return CreateUserResponse(
            success=True,
            message="User created successfully.",
            data=user_response,
            temporaryPassword="Sent directly to member's email address",
            dev_invitation_token=invitation_token if settings.DEBUG else None,
        )

    async def get_all_users(self) -> List[User]:
        """Fetch all registered users for admin directory."""
        return await self.user_repo.get_all()

    async def update_user(self, user_id: uuid.UUID, data: UpdateUserRequest) -> User:
        """Update an existing user's information or role."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        updates = {}
        if data.full_name is not None and data.full_name.strip():
            updates["full_name"] = data.full_name.strip()
        if data.email is not None:
            clean_email = data.email.strip().lower()
            if clean_email != user.email:
                if await self.user_repo.exists_by_email(clean_email):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email is already in use by another account",
                    )
                updates["email"] = clean_email
        if data.role is not None:
            new_role = data.role.strip().lower()
            if new_role not in ["admin", "member"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Role must be either 'ADMIN' or 'MEMBER'",
                )
            updates["role"] = new_role

        updated_user = await self.user_repo.update(user_id, updates)
        return updated_user


    async def setup_invited_password(self, token: str, new_password: str) -> dict:
        """Activate user account by verifying invitation token and setting initial password."""
        redis_client = get_redis_client()
        if not redis_client:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Session storage unavailable",
            )

        redis_key = f"invite_token:{token}"
        token_data_raw = await redis_client.get(redis_key)
        if not token_data_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invitation token",
            )

        try:
            token_data = json.loads(token_data_raw)
            user_id = token_data.get("user_id")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupt invitation token",
            )

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found",
            )

        # Hash new password and update user entity
        user.password_hash = PasswordService.hash_password(new_password)
        self.db.add(user)
        await self.db.commit()

        # Revoke one-time token
        await redis_client.delete(redis_key)
        logger.info("Successfully activated user '%s' via invitation token", user.email)

        return {
            "success": True,
            "message": "Password setup complete. You can now sign in.",
        }

    async def delete_user(self, user_id: uuid.UUID, current_admin: User) -> dict:
        """Delete user account. Only admin can delete users, and admins cannot delete themselves."""
        if current_admin.id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Invalidate any active session in Redis for this user
        redis_client = get_redis_client()
        if redis_client:
            try:
                session_key = f"refresh_token:{user_id}"
                await redis_client.delete(session_key)
            except Exception as exc:
                logger.warning("Failed to clean up Redis session for deleted user %s: %s", user_id, exc)

        await self.user_repo.delete(user_id)
        logger.info("Admin '%s' successfully deleted user '%s' (%s)", current_admin.email, user.full_name, user.id)

        return {
            "success": True,
            "message": "User deleted successfully",
        }

