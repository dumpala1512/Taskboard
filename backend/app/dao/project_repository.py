"""Project Data Access Object (DAO) / Repository."""

from datetime import datetime, timezone
from typing import List, Optional, Union
import uuid
from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.project import Project, project_members
from app.models.user import User


class ProjectRepository:
    """Repository handling database operations for the Project model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, project_id: Union[uuid.UUID, str]) -> Optional[Project]:
        """Fetch a single project by primary key UUID."""
        if isinstance(project_id, str):
            try:
                project_id = uuid.UUID(project_id)
            except ValueError:
                return None
        query = select(Project).options(selectinload(Project.members)).where(Project.id == project_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Optional[Project]:
        """Fetch a project by name (case-insensitive)."""
        clean_name = name.strip().lower()
        query = select(Project).where(func.lower(Project.name) == clean_name)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_all(
        self,
        user_id: Optional[Union[uuid.UUID, str]] = None,
        is_admin: bool = False,
    ) -> List[Project]:
        """Retrieve all projects accessible to the user.
        
        Admins can view all projects; members can view projects they created or belong to.
        """
        if is_admin or user_id is None:
            query = select(Project).options(selectinload(Project.members)).order_by(Project.created_at.desc())
        else:
            if isinstance(user_id, str):
                try:
                    user_id = uuid.UUID(user_id)
                except ValueError:
                    return []
            member_subquery = (
                select(1)
                .select_from(project_members)
                .where(
                    (project_members.c.project_id == Project.id)
                    & (project_members.c.user_id == user_id)
                )
                .exists()
            )
            query = (
                select(Project)
                .options(selectinload(Project.members))
                .where((Project.created_by == user_id) | member_subquery)
                .order_by(Project.created_at.desc())
            )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, project: Project) -> Project:
        """Persist a new Project entity."""
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def update(self, project_id: Union[uuid.UUID, str], updates: dict) -> Optional[Project]:
        """Update fields on an existing project."""
        project = await self.get_by_id(project_id)
        if not project:
            return None
        for key, value in updates.items():
            if hasattr(project, key) and value is not None:
                setattr(project, key, value)
        project.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete(self, project_id: Union[uuid.UUID, str]) -> bool:
        """Permanently delete a project."""
        project = await self.get_by_id(project_id)
        if not project:
            return False
        await self.session.delete(project)
        await self.session.commit()
        return True

    async def is_user_assigned_to_project(
        self,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
    ) -> bool:
        """Check if a user is currently a member of a project."""
        check_q = select(project_members).where(
            (project_members.c.project_id == project_id) & (project_members.c.user_id == user_id)
        )
        exists = (await self.session.execute(check_q)).first()
        return exists is not None

    async def assign_projects_to_user(
        self,
        user_id: uuid.UUID,
        project_ids: List[uuid.UUID],
    ) -> int:
        """Associate multiple projects to a single user."""
        assigned_count = 0
        for pid in project_ids:
            # Check if membership already exists
            check_q = select(project_members).where(
                (project_members.c.project_id == pid) & (project_members.c.user_id == user_id)
            )
            exists = (await self.session.execute(check_q)).first()
            if not exists:
                stmt = insert(project_members).values(project_id=pid, user_id=user_id)
                await self.session.execute(stmt)
                assigned_count += 1
        await self.session.commit()
        return assigned_count

    async def remove_project_from_user(
        self,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
    ) -> bool:
        """Remove a project membership from a user."""
        # Check if membership exists
        check_q = select(project_members).where(
            (project_members.c.project_id == project_id) & (project_members.c.user_id == user_id)
        )
        exists = (await self.session.execute(check_q)).first()
        if not exists:
            return False

        stmt = delete(project_members).where(
            (project_members.c.project_id == project_id) & (project_members.c.user_id == user_id)
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return True
