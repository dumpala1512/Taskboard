"""Project Service handling business logic, validation, and authorization checks."""

import logging
from typing import List, Optional, Union
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.project_repository import ProjectRepository
from app.dao.user_repository import UserRepository
from app.exceptions.handlers import UserAlreadyAssignedException
from app.models.project import Project
from app.models.user import User
from app.schemas.project import (
    CreateProjectRequest,
    UpdateProjectRequest,
)

logger = logging.getLogger(__name__)


class ProjectService:
    """Service handling project management and project member assignment operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)

    async def create_project(self, data: CreateProjectRequest, current_user: User) -> Project:
        """Create a new project. Enforces name uniqueness (409 Conflict on duplicate)."""
        clean_name = data.name.strip()
        existing = await self.project_repo.get_by_name(clean_name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with the provided name already exists.",
            )

        # Owner: use data.owner_id if specified, otherwise current_user.id
        creator_id = data.owner_id or current_user.id

        # Status: use data.status if specified, otherwise "ACTIVE"
        project_status = (data.status or "ACTIVE").strip().upper()

        # Key: use data.key if specified, or auto-generate from name
        key = data.key.strip().upper() if data.key else "".join([w[0] for w in clean_name.split() if w]).upper()[:10]

        new_project = Project(
            name=clean_name,
            key=key if key else None,
            description=data.description,
            status=project_status,
            progress=data.progress if data.progress is not None else 0,
            tags=data.tags or [],
            columns=[],
            start_date=data.start_date,
            end_date=data.end_date,
            created_by=creator_id,
        )
        created_project = await self.project_repo.create(new_project)

        # Build list of members to assign: owner/creator + any members specified in data.members
        member_ids_to_assign = {creator_id}
        if data.members:
            for m_id in data.members:
                member_ids_to_assign.add(m_id)

        for m_id in member_ids_to_assign:
            try:
                await self.project_repo.assign_projects_to_user(m_id, [created_project.id])
            except Exception as exc:
                logger.warning("Could not associate member %s during project creation: %s", m_id, exc)

        refetched = await self.project_repo.get_by_id(created_project.id)
        logger.info("User %s created project '%s' (%s)", current_user.email, created_project.name, created_project.id)
        return refetched or created_project

    async def get_all_projects(self, current_user: User) -> List[Project]:
        """Fetch all projects accessible to the authenticated user.
        
        Admins can view all projects. Standard members view only projects they belong to.
        """
        is_admin = current_user.role.lower() == "admin"
        return await self.project_repo.get_all(user_id=current_user.id, is_admin=is_admin)

    async def get_project_by_id(self, project_id: uuid.UUID, current_user: User) -> Project:
        """Fetch a specific project. Ensures access permission for regular members."""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested project could not be found.",
            )

        # Check access permission if not admin
        if current_user.role.lower() != "admin":
            is_creator = str(project.created_by) == str(current_user.id)
            is_member = any(str(m.id) == str(current_user.id) for m in project.members)
            if not is_creator and not is_member:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to the requested project.",
                )

        return project

    async def update_project(
        self,
        project_id: uuid.UUID,
        data: UpdateProjectRequest,
        current_user: User,
    ) -> Project:
        """Update existing project details. Only admins can update projects."""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested project could not be found.",
            )

        updates = {}
        if data.name is not None:
            clean_name = data.name.strip()
            if clean_name.lower() != project.name.lower():
                existing = await self.project_repo.get_by_name(clean_name)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="A project with the provided name already exists.",
                    )
            updates["name"] = clean_name

        if data.description is not None:
            updates["description"] = data.description
        if data.status is not None:
            updates["status"] = data.status.strip().upper()
        if data.key is not None:
            updates["key"] = data.key.strip().upper() if data.key else None
        if data.progress is not None:
            updates["progress"] = data.progress
        if data.tags is not None:
            updates["tags"] = data.tags
        if data.columns is not None:
            updates["columns"] = data.columns
        if data.owner_id is not None:
            updates["created_by"] = data.owner_id
        if data.start_date is not None:
            updates["start_date"] = data.start_date
        if data.end_date is not None:
            updates["end_date"] = data.end_date

        updated_project = await self.project_repo.update(project_id, updates)

        # Handle updating member associations if provided
        if data.members is not None:
            # Sync members list
            project.members = []
            for m_id in data.members:
                user = await self.user_repo.get_by_id(m_id)
                if user:
                    project.members.append(user)
            await self.db.commit()
            await self.db.refresh(project)
            updated_project = project

        logger.info("Admin %s updated project %s", current_user.email, project_id)
        return updated_project

    async def delete_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
        project: Optional[Project] = None,
    ) -> None:
        """Delete an existing project. Restricted to administrators."""
        if project is None:
            project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested project could not be found.",
            )

        await self.project_repo.delete(project_id)
        logger.info("Admin %s deleted project %s", current_user.email, project_id)

    async def assign_projects(self, user_id: uuid.UUID, project_ids: List[uuid.UUID]) -> int:
        """Assign one or more projects to a user account."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The specified user or one or more projects could not be found.",
            )

        # Verify all projects exist
        for pid in project_ids:
            proj = await self.project_repo.get_by_id(pid)
            if not proj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="The specified user or one or more projects could not be found.",
                )

        # Check if user is already assigned to the project(s)
        for pid in project_ids:
            is_assigned = await self.project_repo.is_user_assigned_to_project(user_id, pid)
            if is_assigned:
                raise UserAlreadyAssignedException(
                    message="User is already assigned to this project."
                )

        assigned_count = await self.project_repo.assign_projects_to_user(user_id, project_ids)
        return assigned_count

    async def remove_project_assignment(self, user_id: uuid.UUID, project_id: uuid.UUID) -> None:
        """Remove a project membership from a user."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The specified user could not be found.",
            )

        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested project could not be found.",
            )

        removed = await self.project_repo.remove_project_from_user(user_id, project_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The specified project assignment could not be found.",
            )
