"""Comment Data Access Object (DAO) / Repository."""

from typing import List, Optional, Union
import uuid
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.comment import Comment


class CommentRepository:
    """Repository handling database operations for the Comment model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, comment: Comment) -> Comment:
        """Persist a new comment entity to the database."""
        self.session.add(comment)
        await self.session.commit()
        await self.session.refresh(comment)
        # Eager load the author details
        return await self.get_by_id(comment.id) or comment

    async def get_by_id(self, comment_id: Union[uuid.UUID, str]) -> Optional[Comment]:
        """Fetch a single comment by primary key UUID."""
        if isinstance(comment_id, str):
            try:
                comment_id = uuid.UUID(comment_id)
            except ValueError:
                return None
        query = (
            select(Comment)
            .options(selectinload(Comment.user), selectinload(Comment.task))
            .where(Comment.id == comment_id)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_task_id(self, task_id: Union[uuid.UUID, str]) -> List[Comment]:
        """Retrieve all comments belonging to a specific task in chronological order."""
        if isinstance(task_id, str):
            try:
                task_id = uuid.UUID(task_id)
            except ValueError:
                return []
        query = (
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update(self, comment_id: Union[uuid.UUID, str], content: str) -> Optional[Comment]:
        """Update comment content."""
        comment = await self.get_by_id(comment_id)
        if not comment:
            return None
        comment.content = content.strip()
        await self.session.commit()
        return await self.get_by_id(comment.id) or comment

    async def delete(self, comment_id: Union[uuid.UUID, str]) -> bool:
        """Delete a comment by ID."""
        if isinstance(comment_id, str):
            try:
                comment_id = uuid.UUID(comment_id)
            except ValueError:
                return False
        stmt = delete(Comment).where(Comment.id == comment_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return (result.rowcount or 0) > 0

