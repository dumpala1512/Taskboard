"""Tests for Admin Member Provisioning, Directory, Update, and Deletion Flow.

Validates:
- GET /taskboard/api/v1/admin/users (Admin-only directory retrieval)
- POST /taskboard/api/v1/admin/users (Admin-only user creation and email invitation)
- PATCH /taskboard/api/v1/admin/users/{user_id} (Admin-only user updates)
- DELETE /taskboard/api/v1/admin/users/{user_id} (Admin-only user deletion, returns 204)
- Setup password endpoint via one-time invitation token
"""

from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.user import User
from app.services.auth_service import token_service


@pytest.fixture
def admin_user() -> User:
    """Fixture providing an administrator User model instance."""
    return User(
        id=uuid.uuid4(),
        full_name="Workspace Admin",
        email="admin@taskboard.com",
        password_hash="admin_hash",
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def member_user() -> User:
    """Fixture providing a standard member User model instance."""
    return User(
        id=uuid.uuid4(),
        full_name="Regular Member",
        email="member@taskboard.com",
        password_hash="member_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ==============================================================================
# 1. GET /taskboard/api/v1/admin/users Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_admin_get_all_users_success(async_client: AsyncClient, admin_user: User, member_user: User):
    """Admin can list all registered users."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.dao.user_repository.UserRepository.get_all", new_callable=AsyncMock) as mock_get_all:

        mock_get.return_value = admin_user
        mock_get_all.return_value = [admin_user, member_user]

        response = await async_client.get(
            "/taskboard/api/v1/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Users retrieved successfully."
        assert len(data["data"]) == 2
        assert data["data"][0]["email"] == "admin@taskboard.com"
        assert data["data"][1]["email"] == "member@taskboard.com"


@pytest.mark.asyncio
async def test_get_all_users_forbidden_for_member(async_client: AsyncClient, member_user: User):
    """Regular member cannot access admin users directory (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = member_user

        response = await async_client.get(
            "/taskboard/api/v1/admin/users",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"


# ==============================================================================
# 2. POST /taskboard/api/v1/admin/users Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_admin_create_user_success(async_client: AsyncClient, admin_user: User):
    """Admin can create a user, email is dispatched, and no temporary password is leaked."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    created_member = User(
        id=uuid.uuid4(),
        full_name="Alice Johnson",
        email="alice@taskboard.com",
        role="member",
        password_hash="hashed_locked_pass",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_admin, \
         patch("app.dao.user_repository.UserRepository.exists_by_email", new_callable=AsyncMock) as mock_exists, \
         patch("app.dao.user_repository.UserRepository.create", new_callable=AsyncMock) as mock_create, \
         patch("app.services.email_service.EmailService.send_invitation_email", new_callable=AsyncMock) as mock_email:

        mock_get_admin.return_value = admin_user
        mock_exists.return_value = False
        mock_create.return_value = created_member

        payload = {
            "fullName": "Alice Johnson",
            "email": "alice@taskboard.com",
            "role": "MEMBER",
        }

        response = await async_client.post(
            "/taskboard/api/v1/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["email"] == "alice@taskboard.com"
        assert data["data"]["full_name"] == "Alice Johnson"
        assert "password" not in data["data"]
        assert mock_email.called


@pytest.mark.asyncio
async def test_create_user_forbidden_for_non_admin(async_client: AsyncClient, member_user: User):
    """Standard member cannot create or invite users (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = member_user

        response = await async_client.post(
            "/taskboard/api/v1/admin/users",
            headers={"Authorization": f"Bearer {member_token}"},
            json={"fullName": "Eve Hax", "email": "eve@taskboard.com"},
        )

        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_create_user_unauthorized(async_client: AsyncClient):
    """Unauthenticated requests without a JWT token receive 401 Unauthorized."""
    response = await async_client.post(
        "/taskboard/api/v1/admin/users",
        json={"fullName": "No Auth", "email": "noauth@taskboard.com"},
    )
    assert response.status_code == 401
    assert response.json()["error"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_create_user_duplicate_email(async_client: AsyncClient, admin_user: User):
    """Attempting to create a user with an already registered email raises 400 Bad Request."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get, \
         patch("app.dao.user_repository.UserRepository.exists_by_email", new_callable=AsyncMock) as mock_exists:

        mock_get.return_value = admin_user
        mock_exists.return_value = True

        response = await async_client.post(
            "/taskboard/api/v1/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"fullName": "Existing User", "email": "existing@taskboard.com"},
        )

        assert response.status_code == 400
        assert "Email is already registered" in response.text


# ==============================================================================
# 3. PATCH /taskboard/api/v1/admin/users/{user_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_admin_update_user_success(async_client: AsyncClient, admin_user: User):
    """Admin can update an existing user's name and role."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    target_id = uuid.uuid4()
    target_user = User(
        id=target_id,
        full_name="Old Name",
        email="old@taskboard.com",
        password_hash="hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    updated_user = User(
        id=target_id,
        full_name="New Name",
        email="old@taskboard.com",
        password_hash="hash",
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get, \
         patch("app.dao.user_repository.UserRepository.update", new_callable=AsyncMock) as mock_update:

        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            elif str(uid) == str(target_id):
                return target_user
            return None

        mock_get.side_effect = side_effect
        mock_update.return_value = updated_user

        response = await async_client.patch(
            f"/taskboard/api/v1/admin/users/{target_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"full_name": "New Name", "role": "ADMIN"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["full_name"] == "New Name"
        assert data["data"]["role"] == "admin"


@pytest.mark.asyncio
async def test_update_user_not_found(async_client: AsyncClient, admin_user: User):
    """Updating a non-existent user returns 404 Not Found."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    non_existent_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get:
        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            return None

        mock_get.side_effect = side_effect

        response = await async_client.patch(
            f"/taskboard/api/v1/admin/users/{non_existent_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"full_name": "Ghost User"},
        )

        assert response.status_code == 404
        assert "User not found" in response.text


# ==============================================================================
# 4. DELETE /taskboard/api/v1/admin/users/{user_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_delete_user_success_by_admin(async_client: AsyncClient, admin_user: User):
    """Admin successfully deletes a user account and receives 204 No Content."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    target_id = uuid.uuid4()
    target_user = User(
        id=target_id,
        full_name="Target User",
        email="target@taskboard.com",
        password_hash="hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get_user, \
         patch("app.dao.user_repository.UserRepository.delete", new_callable=AsyncMock) as mock_delete, \
         patch("app.services.admin_service.get_redis_client") as mock_redis:

        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            elif str(uid) == str(target_id):
                return target_user
            return None

        mock_get_user.side_effect = side_effect
        mock_delete.return_value = True

        response = await async_client.delete(
            f"/taskboard/api/v1/admin/users/{target_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 204
        assert mock_delete.called


@pytest.mark.asyncio
async def test_delete_user_cannot_delete_self(async_client: AsyncClient, admin_user: User):
    """Admin cannot delete their own account."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.delete(
            f"/taskboard/api/v1/admin/users/{admin_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 400
        assert "Cannot delete your own account" in response.text


@pytest.mark.asyncio
async def test_delete_user_not_found(async_client: AsyncClient, admin_user: User):
    """Attempting to delete a non-existent user returns 404 Not Found."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    non_existent_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get_user:
        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            return None

        mock_get_user.side_effect = side_effect

        response = await async_client.delete(
            f"/taskboard/api/v1/admin/users/{non_existent_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404
        assert "User not found" in response.text


@pytest.mark.asyncio
async def test_delete_user_forbidden_for_member(async_client: AsyncClient, member_user: User):
    """Non-admin member cannot delete any user (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )
    target_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.delete(
            f"/taskboard/api/v1/admin/users/{target_id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_delete_user_unauthorized(async_client: AsyncClient):
    """Unauthenticated delete request receives 401 Unauthorized."""
    target_id = uuid.uuid4()
    response = await async_client.delete(
        f"/taskboard/api/v1/admin/users/{target_id}",
    )
    assert response.status_code == 401
    assert response.json()["error"] == "UNAUTHORIZED"


# ==============================================================================
# 5. Setup Password Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_setup_password_endpoint_success(async_client: AsyncClient):
    """Invited user activates their account using valid invitation token."""
    user_id = uuid.uuid4()
    target_user = User(
        id=user_id,
        full_name="Invited Member",
        email="invited@taskboard.com",
        password_hash="temp_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    mock_redis = AsyncMock()
    mock_redis.get.return_value = json.dumps({"user_id": str(user_id), "email": "invited@taskboard.com"})
    mock_redis.delete.return_value = True

    with patch("app.services.admin_service.get_redis_client", return_value=mock_redis), \
         patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("sqlalchemy.ext.asyncio.AsyncSession.commit", new_callable=AsyncMock):

        mock_get_user.return_value = target_user

        response = await async_client.post(
            "/taskboard/api/v1/auth/setup-password",
            json={"token": "valid-invite-token-123", "newPassword": "NewStrongPassword123!"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Password setup complete" in data["message"]


@pytest.mark.asyncio
async def test_setup_password_expired_token(async_client: AsyncClient):
    """Expired or invalid invitation token returns 400 Bad Request."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    with patch("app.services.admin_service.get_redis_client", return_value=mock_redis):
        response = await async_client.post(
            "/taskboard/api/v1/auth/setup-password",
            json={"token": "expired-token", "newPassword": "NewPassword123!"},
        )
        assert response.status_code == 400
        assert "Invalid or expired invitation token" in response.text
