"""Authentication, Password Security, JWT Tokens, and Redis Sessions.

All core authentication logic consolidated simply into one module.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import json
import logging
import secrets
from typing import Any, Dict, Optional
import uuid
import bcrypt
from fastapi import BackgroundTasks, HTTPException, status
import jwt
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.dao.user_repository import UserRepository
from app.services.email_service import EmailService
from app.exceptions.handlers import (
    ExpiredTokenException,
    InvalidCredentialsException,
    InvalidTokenException,
    RefreshTokenNotFoundException,
    UnauthorizedException,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenResponse,
    UserResponse,
)
from app.utils.redis import get_redis_client

logger = logging.getLogger(__name__)
settings = get_settings()


# ==============================================================================
# 1. Password Hashing & Verification
# ==============================================================================
class PasswordService:
    """Simple bcrypt password hashing and verification."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash plain text password using bcrypt."""
        if not password:
            raise ValueError("Password cannot be empty.")
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify plain password against stored bcrypt hash."""
        if not plain_password or not hashed_password:
            return False
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False


password_service = PasswordService()


# ==============================================================================
# 2. JWT Access & Refresh Token Management
# ==============================================================================
class TokenService:
    """Simple signed JWT token creation, decoding, and validation."""

    def __init__(self, secret_key: Optional[str] = None, algorithm: Optional[str] = None) -> None:
        self.secret_key = secret_key or settings.JWT_SECRET
        self.algorithm = algorithm or settings.JWT_ALGORITHM

    def create_jwt(self, claims: Dict[str, Any], expires_delta: timedelta) -> str:
        """Mint a signed JWT containing payload claims and expiration."""
        now = datetime.now(timezone.utc)
        payload = claims.copy()
        payload.update(
            {
                "exp": now + expires_delta,
                "iat": now,
                "jti": uuid.uuid4().hex,
            }
        )
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Generate short-lived access token."""
        delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        claims = {
            "user_id": str(user_id),
            "email": email,
            "role": role,
            "token_type": "access",
        }
        return self.create_jwt(claims=claims, expires_delta=delta)

    def create_refresh_token(
        self,
        user_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Generate long-lived refresh token."""
        delta = expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        claims = {
            "user_id": str(user_id),
            "email": email,
            "role": role,
            "token_type": "refresh",
        }
        return self.create_jwt(claims=claims, expires_delta=delta)

    def decode_jwt(self, token: str) -> Dict[str, Any]:
        """Decode and verify token signature and expiry."""
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            raise ExpiredTokenException("Token has expired")
        except jwt.PyJWTError:
            raise InvalidTokenException("Invalid token signature or format")

    def validate_token(self, token: str, expected_type: str = "access") -> Dict[str, Any]:
        """Verify token and ensure token_type matches expectation."""
        payload = self.decode_jwt(token)
        token_type = payload.get("token_type")
        if token_type != expected_type:
            raise InvalidTokenException(
                f"Invalid token type: expected '{expected_type}', got '{token_type}'"
            )
        if not payload.get("user_id"):
            raise InvalidTokenException("Token missing user_id")
        return payload


token_service = TokenService()


# ==============================================================================
# 3. Redis Session Management (Refresh Tokens)
# ==============================================================================
class SessionService:
    """Manages active refresh tokens in Redis. Access tokens are not stored in Redis."""

    def __init__(self, redis: Optional[Redis] = None) -> None:
        self._redis = redis

    def _get_client(self) -> Redis:
        return self._redis if self._redis is not None else get_redis_client()

    @staticmethod
    def _get_token_identifier(refresh_token: str) -> str:
        try:
            payload = token_service.decode_jwt(refresh_token)
            jti = payload.get("jti")
            if jti:
                return str(jti)
        except Exception:
            pass
        return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

    async def save_refresh_token(
        self,
        user_id: str,
        refresh_token: str,
        expires_in_seconds: Optional[int] = None,
    ) -> None:
        """Store active refresh token with user_id as direct key identifier."""
        client = self._get_client()
        ttl = expires_in_seconds or int(settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        token_key = f"refresh_token:{user_id}"
        await client.set(token_key, refresh_token, ex=ttl)

    async def validate_refresh_token(self, user_id: str, refresh_token: str) -> bool:
        """Check if refresh token is currently active in Redis for this user."""
        client = self._get_client()
        val = await client.get(f"refresh_token:{user_id}")
        if val == refresh_token or val == "active":
            return True
        # Fallback check for token_id subkey
        token_id = self._get_token_identifier(refresh_token)
        legacy_val = await client.get(f"refresh_token:{user_id}:{token_id}")
        return legacy_val in ("active", refresh_token)

    async def revoke_refresh_token(self, user_id: str, refresh_token: Optional[str] = None) -> None:
        """Revoke a user's refresh token."""
        client = self._get_client()
        await client.delete(f"refresh_token:{user_id}")
        if refresh_token:
            token_id = self._get_token_identifier(refresh_token)
            await client.delete(f"refresh_token:{user_id}:{token_id}")

    async def logout_invalidation(
        self,
        user_id: str,
        refresh_token: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> None:
        """Revoke and completely remove user's session and blacklist access token in Redis upon logout."""
        client = self._get_client()
        if not client:
            return

        try:
            await client.delete(f"refresh_token:{user_id}")
            if refresh_token:
                token_id = self._get_token_identifier(refresh_token)
                await client.delete(f"refresh_token:{user_id}:{token_id}")

            if access_token:
                token_hash = hashlib.sha256(access_token.encode("utf-8")).hexdigest()
                ttl = int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
                await client.set(f"revoked_token:{token_hash}", "true", ex=ttl)

            logout_ttl = int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 2)
            current_ts = int(datetime.now(timezone.utc).timestamp())
            await client.set(f"user_logout:{user_id}", str(current_ts), ex=logout_ttl)

            matched_keys = await client.keys(f"refresh_token:{user_id}*")
            if matched_keys:
                await client.delete(*matched_keys)
        except Exception as exc:
            logger.warning("Error during Redis logout invalidation for user %s: %s", user_id, exc)

    async def is_token_revoked(
        self,
        user_id: Optional[str],
        token: str,
        token_iat: Optional[int] = None,
    ) -> bool:
        """Check if an access token or user has been revoked via logout."""
        try:
            client = self._get_client()
            if not client:
                return False

            token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
            is_blacklisted = await client.get(f"revoked_token:{token_hash}")
            if is_blacklisted:
                return True

            if user_id:
                logout_ts_str = await client.get(f"user_logout:{user_id}")
                if logout_ts_str:
                    try:
                        logout_ts = int(logout_ts_str)
                        if token_iat is not None and token_iat <= logout_ts:
                            return True
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("Redis token revocation check bypassed: %s", exc)
            return False

        return False


session_service = SessionService()


# ==============================================================================
# 4. Authentication Service Orchestrator
# ==============================================================================
class AuthenticationService:
    """Coordinates credential checks, token issuance, session storage, and profile lookup."""

    def __init__(
        self,
        session: AsyncSession,
        pwd_service: Optional[PasswordService] = None,
        tok_service: Optional[TokenService] = None,
        sess_service: Optional[SessionService] = None,
    ) -> None:
        self.session = session
        self.user_repo = UserRepository(session)
        self.password_service = pwd_service or password_service
        self.token_service = tok_service or token_service
        self.session_service = sess_service or session_service

    async def verify_credentials(self, email: str, password: str) -> User:
        """Verify user email existence and password matching."""
        user = await self.user_repo.get_by_email(email)
        if not user or not self.password_service.verify_password(password, user.password_hash):
            raise InvalidCredentialsException("Invalid email or password")
        return user

    def generate_access_token(self, user: User) -> str:
        """Generate access token for a user."""
        return self.token_service.create_access_token(
            user_id=str(user.id),
            email=user.email,
            role=user.role,
        )

    def generate_refresh_token(self, user: User) -> str:
        """Generate refresh token for a user."""
        return self.token_service.create_refresh_token(
            user_id=str(user.id),
            email=user.email,
            role=user.role,
        )

    async def login(self, login_data: LoginRequest) -> LoginResponse:
        """Verify credentials, create tokens, store refresh session in Redis, return profile."""
        user = await self.verify_credentials(login_data.email, login_data.password)

        access_token = self.generate_access_token(user)
        refresh_token = self.generate_refresh_token(user)

        ttl_seconds = int(settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        await self.session_service.save_refresh_token(
            user_id=str(user.id),
            refresh_token=refresh_token,
            expires_in_seconds=ttl_seconds,
        )

        access_ttl = int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        refresh_ttl = int(settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            access_token_expires_in=access_ttl,
            refresh_token_expires_in=refresh_ttl,
        )

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Validate active refresh token in Redis, rotate it, and return new token pair."""
        payload = self.token_service.validate_token(refresh_token, expected_type="refresh")
        user_id = payload.get("user_id")

        if not user_id:
            raise InvalidTokenException("Refresh token missing user_id")

        is_active = await self.session_service.validate_refresh_token(user_id, refresh_token)
        if not is_active:
            raise RefreshTokenNotFoundException("Refresh token is invalid or has expired")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise InvalidCredentialsException("User account associated with token not found")

        # Rotate tokens: revoke old, mint & save new
        await self.session_service.revoke_refresh_token(user_id, refresh_token)
        new_access_token = self.generate_access_token(user)
        new_refresh_token = self.generate_refresh_token(user)

        ttl_seconds = int(settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
        await self.session_service.save_refresh_token(
            user_id=user_id,
            refresh_token=new_refresh_token,
            expires_in_seconds=ttl_seconds,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=int(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60),
        )

    async def logout(
        self,
        user_id: str,
        refresh_token: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> None:
        """Revoke refresh session and blacklist access token in Redis."""
        if access_token is not None:
            await self.session_service.logout_invalidation(
                user_id,
                refresh_token,
                access_token=access_token,
            )
        else:
            await self.session_service.logout_invalidation(user_id, refresh_token)

    async def verify_current_user(self, token_payload: dict) -> User:
        """Fetch user by id from validated token claims."""
        user_id = token_payload.get("user_id")
        if not user_id:
            raise InvalidTokenException("Token missing user identity claim")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User no longer exists")

        return user

    async def request_password_reset(
        self,
        email: str,
        background_tasks: BackgroundTasks,
    ) -> Dict[str, Any]:
        """Initiate password reset: generate one-time token, store in Redis, dispatch email."""
        clean_email = email.strip().lower()
        user = await self.user_repo.get_by_email(clean_email)

        generic_message = "If an account exists with this email address, a password reset link has been sent."

        if not user:
            logger.info("Password reset requested for non-existent email: %s", clean_email)
            return {"message": generic_message}

        reset_token = secrets.token_urlsafe(32)
        redis_client = get_redis_client()
        if redis_client:
            redis_key = f"reset_token:{reset_token}"
            payload = json.dumps({
                "user_id": str(user.id),
                "email": user.email,
            })
            ttl_seconds = 3600  # 1 hour
            try:
                await redis_client.set(redis_key, payload, ex=ttl_seconds)
            except Exception as exc:
                logger.error("Failed to store password reset token in Redis: %s", exc)

        background_tasks.add_task(
            EmailService.send_password_reset_email,
            email=user.email,
            name=user.full_name,
            token=reset_token,
        )

        return {
            "message": generic_message,
            "dev_reset_token": reset_token if settings.DEBUG else None,
        }

    async def verify_reset_token(self, token: str) -> Dict[str, Any]:
        """Validate whether a password reset token exists in Redis and has not expired."""
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        redis_client = get_redis_client()
        if not redis_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache service unavailable",
            )

        redis_key = f"reset_token:{token}"
        token_data_raw = await redis_client.get(redis_key)
        if not token_data_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        return {"success": True, "message": "Token is valid"}

    async def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        """Validate reset token and update user's permanent password."""
        if not token or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token and password are required",
            )

        redis_client = get_redis_client()
        if not redis_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache service unavailable",
            )

        redis_key = f"reset_token:{token}"
        token_data_raw = await redis_client.get(redis_key)
        if not token_data_raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        try:
            token_data = json.loads(token_data_raw)
            user_id = token_data.get("user_id")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token data payload",
            )

        updated_user = await self.user_repo.update(
            user_id,
            {"password_hash": PasswordService.hash_password(new_password)},
        )
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account associated with reset token not found",
            )

        # Invalidate one-time reset token
        await redis_client.delete(redis_key)

        # Revoke existing sessions
        await self.session_service.logout_invalidation(str(updated_user.id))

        logger.info("Successfully reset password for user %s (%s)", updated_user.email, updated_user.id)
        return {"success": True, "message": "Password has been reset successfully"}

