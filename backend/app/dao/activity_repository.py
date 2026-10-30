"""Activity Data Access Object (DAO) / Repository."""

from typing import List, Optional, Union
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.activity import Activity


class ActivityRepository:
    """Repository handling database operations for the Activity model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, activity: Activity) -> Activity:
        """Persist a new activity entity to the database."""
        self.session.add(activity)
        await self.session.commit()
        await self.session.refresh(activity)
        return await self.get_by_id(activity.id) or activity

    async def get_by_id(self, activity_id: Union[uuid.UUID, str]) -> Optional[Activity]:
        """Fetch an individual activity by primary key UUID."""
        if isinstance(activity_id, str):
            try:
                activity_id = uuid.UUID(activity_id)
            except ValueError:
                return None
        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(Activity.id == activity_id)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_project_id(
        self,
        project_id: Union[uuid.UUID, str],
        limit: int = 50,
    ) -> List[Activity]:
        """Retrieve recent activities for a specific project sorted newest first."""
        if isinstance(project_id, str):
            try:
                project_id = uuid.UUID(project_id)
            except ValueError:
                return []
        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(Activity.project_id == project_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_all(self, limit: int = 50) -> List[Activity]:
        """Retrieve recent activities across all projects sorted newest first."""
        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_for_member(
        self,
        user_id: uuid.UUID,
        project_ids: List[uuid.UUID],
        limit: int = 50,
    ) -> List[Activity]:
        """Retrieve activities accessible to a non-admin member.

        Includes activities in projects the member belongs to, or actions performed by the member.
        """
        clauses = [Activity.user_id == user_id]
        if project_ids:
            clauses.append(Activity.project_id.in_(project_ids))

        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(or_(*clauses))
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

