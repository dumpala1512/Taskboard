"""User Data Access Object (DAO) / Repository."""

from datetime import datetime, timezone
from typing import List, Optional, Union
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


class UserRepository:
    """Repository handling raw database interactions for the User model.

    Contains pure database queries without business logic, hashing, or session caching.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a single user by case-insensitive email address."""
        clean_email = email.strip().lower()
        query = select(User).where(func.lower(User.email) == clean_email)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_id(self, user_id: Union[uuid.UUID, str]) -> Optional[User]:
        """Fetch a single user by primary key UUID."""
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return None
        query = select(User).where(User.id == user_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def create(self, user: User) -> User:
        """Persist a new User entity to the database."""
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update_last_login(self, user_id: Union[uuid.UUID, str]) -> Optional[User]:
        """Optionally touch user update timestamp on login."""
        user = await self.get_by_id(user_id)
        if user:
            user.updated_at = datetime.now(timezone.utc)
            await self.session.commit()
            await self.session.refresh(user)
        return user

    async def exists_by_email(self, email: str) -> bool:
        """Check whether an account with the given email already exists."""
        clean_email = email.strip().lower()
        query = select(func.count(User.id)).where(func.lower(User.email) == clean_email)
        result = await self.session.execute(query)
        count = result.scalar_one_or_none() or 0
        return count > 0

    async def get_all(self) -> List[User]:
        """Fetch all registered users ordered by created_at desc."""
        query = select(User).order_by(User.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update(self, user_id: Union[uuid.UUID, str], updates: dict) -> Optional[User]:
        """Update user fields."""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        for key, value in updates.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, user_id: Union[uuid.UUID, str]) -> bool:
        """Delete user by ID from the database."""
        user = await self.get_by_id(user_id)
        if not user:
            return False
        await self.session.delete(user)
        await self.session.commit()
        return True


