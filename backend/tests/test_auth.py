"""Comprehensive Authentication and Session Management Test Suite.

Covers:
- Password hashing and verification service
- JWT token service (issuance, decode, expiration, claims)
- Redis session management (save, validate, revoke, logout)
- User repository operations (get_by_email, get_by_id, exists_by_email)
- AuthenticationService domain flows (login, invalid creds, refresh, logout)
- FastAPI dependencies (get_current_user, require_admin, require_member)
- Authentication API endpoints (login, refresh, logout, me)
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.exceptions.handlers import (
    ForbiddenException,
    InvalidCredentialsException,
    InvalidTokenException,
    RefreshTokenNotFoundException,
    UnauthorizedException,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest
from app.services.auth_service import (
    AuthenticationService,
    PasswordService,
    SessionService,
    TokenService,
    password_service,
    session_service,
    token_service,
)


# ==============================================================================
# 1. Password Service Unit Tests
# ==============================================================================
def test_password_hashing_and_verification():
    """Verify that PasswordService hashes passwords securely and verifies them accurately."""
    raw_password = "SecurePassword123!"
    hashed = password_service.hash_password(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert password_service.verify_password(raw_password, hashed) is True
    assert password_service.verify_password("WrongPassword!", hashed) is False
    assert password_service.verify_password("", hashed) is False


# ==============================================================================
# 2. Token Service Unit Tests
# ==============================================================================
def test_token_service_generation_and_validation():
    """Verify TokenService mints JWTs with user_id, email, role, and token_type."""
    user_id = str(uuid.uuid4())
    email = "engineer@taskboard.com"
    role = "admin"

    # Access Token
    access_token = token_service.create_access_token(user_id=user_id, email=email, role=role)
    payload = token_service.validate_token(access_token, expected_type="access")
    assert payload["user_id"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role
    assert payload["token_type"] == "access"
    assert "exp" in payload
    assert "jti" in payload

    # Refresh Token
    refresh_token = token_service.create_refresh_token(user_id=user_id, email=email, role=role)
    refresh_payload = token_service.validate_token(refresh_token, expected_type="refresh")
    assert refresh_payload["user_id"] == user_id
    assert refresh_payload["token_type"] == "refresh"

    # Mismatched expected_type
    with pytest.raises(InvalidTokenException):
        token_service.validate_token(access_token, expected_type="refresh")


# ==============================================================================
# 3. Redis Session Service Unit Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_session_service_lifecycle():
    """Verify SessionService saves, validates, revokes, and invalidates refresh tokens."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = "active"
    mock_redis.smembers.return_value = {"token_jti_1"}

    service = SessionService(redis=mock_redis)
    user_id = str(uuid.uuid4())
    token = token_service.create_refresh_token(user_id, "test@test.com", "member")

    # Save
    await service.save_refresh_token(user_id, token, expires_in_seconds=3600)
    assert mock_redis.set.called

    # Validate
    is_valid = await service.validate_refresh_token(user_id, token)
    assert is_valid is True

    # Revoke
    await service.revoke_refresh_token(user_id, token)
    assert mock_redis.delete.called

    # Logout Invalidation with token
    await service.logout_invalidation(user_id, refresh_token=token)
    assert mock_redis.delete.called


# ==============================================================================
# 4. User Repository Unit Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_user_repository_get_by_email():
    """Verify UserRepository correctly constructs queries and retrieves user by email."""
    from app.dao.user_repository import UserRepository

    mock_session = AsyncMock()
    mock_result = MagicMock()
    expected_user = User(
        id=uuid.uuid4(),
        full_name="Jane Doe",
        email="jane@example.com",
        password_hash="hash",
        role="member",
    )
    mock_result.scalars.return_value.first.return_value = expected_user
    mock_session.execute.return_value = mock_result

    repo = UserRepository(mock_session)
    user = await repo.get_by_email("JANE@example.com")

    assert user is not None
    assert user.email == "jane@example.com"
    assert mock_session.execute.called


# ==============================================================================
# 5. Authentication Service Domain Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_auth_service_successful_login():
    """Verify AuthenticationService.login executes full success flow."""
    mock_session = AsyncMock()
    test_user = User(
        id=uuid.uuid4(),
        full_name="Alice Smith",
        email="alice@company.com",
        password_hash=password_service.hash_password("ValidPassword123!"),
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    mock_sess_service = AsyncMock()
    service = AuthenticationService(session=mock_session, sess_service=mock_sess_service)
    service.user_repo = AsyncMock()
    service.user_repo.get_by_email.return_value = test_user

    login_req = LoginRequest(email="alice@company.com", password="ValidPassword123!")
    response = await service.login(login_req)

    assert response.access_token is not None
    assert response.refresh_token is not None
    assert response.token_type == "bearer"
    assert response.access_token_expires_in == 86400
    assert response.refresh_token_expires_in == 604800
    assert mock_sess_service.save_refresh_token.called


@pytest.mark.asyncio
async def test_auth_service_invalid_password():
    """Verify AuthenticationService raises InvalidCredentialsException on bad password."""
    mock_session = AsyncMock()
    test_user = User(
        id=uuid.uuid4(),
        full_name="Bob Jones",
        email="bob@company.com",
        password_hash=password_service.hash_password("CorrectPassword!"),
        role="member",
    )

    service = AuthenticationService(session=mock_session)
    service.user_repo = AsyncMock()
    service.user_repo.get_by_email.return_value = test_user

    login_req = LoginRequest(email="bob@company.com", password="WrongPassword!")
    with pytest.raises(InvalidCredentialsException):
        await service.login(login_req)


@pytest.mark.asyncio
async def test_auth_service_invalid_email():
    """Verify AuthenticationService raises InvalidCredentialsException when email does not exist."""
    mock_session = AsyncMock()
    service = AuthenticationService(session=mock_session)
    service.user_repo = AsyncMock()
    service.user_repo.get_by_email.return_value = None

    login_req = LoginRequest(email="unknown@company.com", password="SomePassword!")
    with pytest.raises(InvalidCredentialsException):
        await service.login(login_req)


@pytest.mark.asyncio
async def test_auth_service_refresh_token_validation_and_rotation():
    """Verify refresh_access_token validates against Redis, rotates token, and updates session."""
    mock_session = AsyncMock()
    mock_sess_service = AsyncMock()
    mock_sess_service.validate_refresh_token.return_value = True

    test_user = User(
        id=uuid.uuid4(),
        full_name="Charlie Member",
        email="charlie@company.com",
        password_hash="hash",
        role="member",
    )

    service = AuthenticationService(session=mock_session, sess_service=mock_sess_service)
    service.user_repo = AsyncMock()
    service.user_repo.get_by_id.return_value = test_user

    old_refresh_token = token_service.create_refresh_token(
        str(test_user.id), test_user.email, test_user.role
    )

    new_tokens = await service.refresh_access_token(old_refresh_token)

    assert new_tokens.access_token is not None
    assert new_tokens.refresh_token is not None
    assert new_tokens.refresh_token != old_refresh_token
    assert mock_sess_service.revoke_refresh_token.called
    assert mock_sess_service.save_refresh_token.called


@pytest.mark.asyncio
async def test_auth_service_refresh_token_not_found():
    """Verify RefreshTokenNotFoundException is raised when refresh token is revoked in Redis."""
    mock_session = AsyncMock()
    mock_sess_service = AsyncMock()
    mock_sess_service.validate_refresh_token.return_value = False

    service = AuthenticationService(session=mock_session, sess_service=mock_sess_service)
    user_id = str(uuid.uuid4())
    token = token_service.create_refresh_token(user_id, "test@test.com", "member")

    with pytest.raises(RefreshTokenNotFoundException):
        await service.refresh_access_token(token)


@pytest.mark.asyncio
async def test_auth_service_logout():
    """Verify logout triggers session revocation in Redis."""
    mock_session = AsyncMock()
    mock_sess_service = AsyncMock()
    service = AuthenticationService(session=mock_session, sess_service=mock_sess_service)

    user_id = str(uuid.uuid4())
    await service.logout(user_id=user_id, refresh_token="some-token")
    mock_sess_service.logout_invalidation.assert_called_once_with(user_id, "some-token")


# ==============================================================================
# 6. Dependency Tests (get_current_user, require_admin, require_member)
# ==============================================================================
@pytest.mark.asyncio
async def test_dependencies_current_user_and_roles():
    """Verify get_current_user resolves identity and require_admin/member enforces roles."""
    from app.dependencies.auth import get_current_user, require_admin, require_member

    admin_user = User(
        id=uuid.uuid4(),
        full_name="Admin Boss",
        email="admin@test.local",
        password_hash="hash",
        role="admin",
    )
    member_user = User(
        id=uuid.uuid4(),
        full_name="Team Dev",
        email="dev@test.local",
        password_hash="hash",
        role="member",
    )

    # Missing token -> 401
    with pytest.raises(UnauthorizedException):
        await get_current_user(token=None, db=AsyncMock())

    # Valid token resolution
    token = token_service.create_access_token(str(admin_user.id), admin_user.email, admin_user.role)
    mock_db = AsyncMock()
    with patch("app.dependencies.auth.AuthenticationService.verify_current_user", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = admin_user
        resolved_user = await get_current_user(token=token, db=mock_db)
        assert resolved_user.id == admin_user.id

    # require_admin allows admin
    assert (await require_admin(admin_user)) == admin_user

    # require_admin rejects member -> 403
    with pytest.raises(ForbiddenException):
        await require_admin(member_user)

    # require_member allows member and admin
    assert (await require_member(member_user)) == member_user
    assert (await require_member(admin_user)) == admin_user


# ==============================================================================
# 7. API Endpoints Integration Tests (login, refresh, logout, me)
# ==============================================================================
@pytest.mark.asyncio
async def test_api_login_success(async_client: AsyncClient):
    """Verify POST /auth/login returns 200 with tokens and user schema."""
    test_user = User(
        id=uuid.uuid4(),
        full_name="Super Admin",
        email="superadmin@taskboard.com",
        password_hash=password_service.hash_password("SuperSecret123!"),
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_email", new_callable=AsyncMock) as mock_get, \
         patch("app.services.auth_service.SessionService.save_refresh_token", new_callable=AsyncMock):
        mock_get.return_value = test_user

        response = await async_client.post(
            "/taskboard/api/v1/auth/login",
            json={"email": "superadmin@taskboard.com", "password": "SuperSecret123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["access_token_expires_in"] == 86400
        assert data["refresh_token_expires_in"] == 604800


@pytest.mark.asyncio
async def test_api_login_invalid_credentials(async_client: AsyncClient):
    """Verify POST /taskboard/api/v1/auth/login returns 401 on incorrect password with standardized ErrorResponse."""
    with patch("app.dao.user_repository.UserRepository.get_by_email", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None

        response = await async_client.post(
            "/taskboard/api/v1/auth/login",
            json={"email": "nonexistent@taskboard.com", "password": "Password123!"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "INVALID_CREDENTIALS"
        assert "Invalid email or password" in data["message"]


@pytest.mark.asyncio
async def test_api_refresh_token_endpoint(async_client: AsyncClient):
    """Verify POST /taskboard/api/v1/auth/refresh returns 200 with new rotated tokens."""
    test_user = User(
        id=uuid.uuid4(),
        full_name="Refresh User",
        email="refresh@taskboard.com",
        password_hash="hash",
        role="member",
    )
    refresh_token = token_service.create_refresh_token(
        str(test_user.id), test_user.email, test_user.role
    )

    with patch("app.services.auth_service.SessionService.validate_refresh_token", new_callable=AsyncMock) as mock_valid, \
         patch("app.services.auth_service.SessionService.revoke_refresh_token", new_callable=AsyncMock), \
         patch("app.services.auth_service.SessionService.save_refresh_token", new_callable=AsyncMock), \
         patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_valid.return_value = True
        mock_get_user.return_value = test_user

        response = await async_client.post(
            "/taskboard/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_api_logout_endpoint(async_client: AsyncClient):
    """Verify POST /taskboard/api/v1/auth/logout invalidates session and returns SuccessResponse."""
    test_user = User(
        id=uuid.uuid4(),
        full_name="Logout User",
        email="logout@taskboard.com",
        password_hash="hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    access_token = token_service.create_access_token(
        str(test_user.id), test_user.email, test_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.services.auth_service.SessionService.logout_invalidation", new_callable=AsyncMock) as mock_logout:
        mock_get_user.return_value = test_user

        response = await async_client.post(
            "/taskboard/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"refresh_token": "some-refresh-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Successfully logged out"
        assert mock_logout.called


@pytest.mark.asyncio
async def test_api_get_me_protected_endpoint(async_client: AsyncClient):
    """Verify GET /taskboard/api/v1/auth/me returns 200 with user profile when authenticated and 401 when missing."""
    # 1. Unauthorized request
    unauth_resp = await async_client.get("/taskboard/api/v1/auth/me")
    assert unauth_resp.status_code == 401
    assert unauth_resp.json()["error"] == "UNAUTHORIZED"

    # 2. Authorized request
    test_user = User(
        id=uuid.uuid4(),
        full_name="Authenticated User",
        email="authme@taskboard.com",
        password_hash="hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    access_token = token_service.create_access_token(
        str(test_user.id), test_user.email, test_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = test_user

        auth_resp = await async_client.get(
            "/taskboard/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert auth_resp.status_code == 200
        data = auth_resp.json()
        assert data["email"] == "authme@taskboard.com"
        assert data["full_name"] == "Authenticated User"
        assert data["role"] == "member"


@pytest.mark.asyncio
async def test_get_me_after_logout_is_unauthorized(async_client: AsyncClient):
    """Verify GET /taskboard/api/v1/auth/me returns 401 Unauthorized if the user's token or session has been revoked."""
    test_user = User(
        id=uuid.uuid4(),
        full_name="Logged Out User",
        email="loggedout@taskboard.com",
        password_hash="hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    access_token = token_service.create_access_token(
        str(test_user.id), test_user.email, test_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.services.auth_service.SessionService.is_token_revoked", new_callable=AsyncMock) as mock_revoked:
        mock_get_user.return_value = test_user
        mock_revoked.return_value = True

        response = await async_client.get(
            "/taskboard/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert "logged out" in data["message"].lower() or "revoked" in data["message"].lower()


@pytest.mark.asyncio
async def test_forgot_password_success(async_client: AsyncClient):
    """POST /taskboard/api/v1/auth/forgot-password sends email and returns 200."""
    user = User(
        id=uuid.uuid4(),
        full_name="Forgot User",
        email="forgot@taskboard.com",
        password_hash="somehash",
        role="member",
    )
    with patch("app.dao.user_repository.UserRepository.get_by_email", new_callable=AsyncMock) as mock_get_email, \
         patch("app.services.auth_service.get_redis_client") as mock_redis, \
         patch("app.services.email_service.EmailService.send_password_reset_email", new_callable=AsyncMock) as mock_send_email:

        mock_get_email.return_value = user
        mock_redis_instance = AsyncMock()
        mock_redis.return_value = mock_redis_instance

        resp = await async_client.post(
            "/taskboard/api/v1/auth/forgot-password",
            json={"email": "forgot@taskboard.com"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "password reset link has been sent" in data["message"]
        assert mock_send_email.called


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_email(async_client: AsyncClient):
    """POST /taskboard/api/v1/auth/forgot-password with nonexistent email still returns 200 (anti-enumeration)."""
    with patch("app.dao.user_repository.UserRepository.get_by_email", new_callable=AsyncMock) as mock_get_email:
        mock_get_email.return_value = None

        resp = await async_client.post(
            "/taskboard/api/v1/auth/forgot-password",
            json={"email": "nonexistent@taskboard.com"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "password reset link has been sent" in data["message"]


@pytest.mark.asyncio
async def test_verify_reset_token_valid(async_client: AsyncClient):
    """GET /taskboard/api/v1/auth/verify-reset-token returns 200 when token is in Redis."""
    with patch("app.services.auth_service.get_redis_client") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis_instance.get.return_value = '{"user_id": "123", "email": "test@test.com"}'
        mock_redis.return_value = mock_redis_instance

        resp = await async_client.get(
            "/taskboard/api/v1/auth/verify-reset-token?token=valid_token"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["message"] == "Token is valid"


@pytest.mark.asyncio
async def test_verify_reset_token_invalid(async_client: AsyncClient):
    """GET /taskboard/api/v1/auth/verify-reset-token returns 400 when token not found in Redis."""
    with patch("app.services.auth_service.get_redis_client") as mock_redis:
        mock_redis_instance = AsyncMock()
        mock_redis_instance.get.return_value = None
        mock_redis.return_value = mock_redis_instance

        resp = await async_client.get(
            "/taskboard/api/v1/auth/verify-reset-token?token=invalid_token"
        )
        assert resp.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_success(async_client: AsyncClient):
    """POST /taskboard/api/v1/auth/reset-password updates password and invalidates token."""
    user = User(
        id=uuid.uuid4(),
        full_name="Reset User",
        email="reset@taskboard.com",
        password_hash="oldhash",
        role="member",
    )
    with patch("app.services.auth_service.get_redis_client") as mock_redis, \
         patch("app.dao.user_repository.UserRepository.update", new_callable=AsyncMock) as mock_update, \
         patch("app.services.auth_service.SessionService.logout_invalidation", new_callable=AsyncMock) as mock_logout:

        mock_redis_instance = AsyncMock()
        mock_redis_instance.get.return_value = f'{{"user_id": "{user.id}", "email": "{user.email}"}}'
        mock_redis.return_value = mock_redis_instance
        mock_update.return_value = user

        resp = await async_client.post(
            "/taskboard/api/v1/auth/reset-password",
            json={"token": "valid_reset_token", "password": "NewSecurePassword123!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "reset successfully" in data["message"].lower()
        assert mock_redis_instance.delete.called

