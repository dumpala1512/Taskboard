"""Project Service handling business logic, validation, and authorization checks."""

from datetime import date, datetime, timezone
import logging
from typing import Any, List, Optional, Union
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
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)


class ProjectService:
    """Service handling project management and project member assignment operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)
        self.activity_service = ActivityService(db)

    @classmethod
    def _parse_date(cls, date_val: Optional[Union[str, date, datetime]]) -> Optional[date]:
        """Safely parse a date value from string, date, or datetime representations."""
        if not date_val:
            return None
        if isinstance(date_val, datetime):
            return date_val.date()
        if isinstance(date_val, date):
            return date_val
        if isinstance(date_val, str):
            clean_str = date_val.strip()
            if not clean_str:
                return None
            if "T" in clean_str:
                clean_str = clean_str.split("T")[0]
            try:
                return date.fromisoformat(clean_str)
            except ValueError:
                return None
        return None

    @classmethod
    def calculate_project_progress(
        cls,
        status: Optional[str] = None,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        tasks: Optional[List[Any]] = None,
    ) -> int:
        """Calculate dynamic project progress percentage (0 to 100).

        Calculation Rules:
        1. If status is explicitly 'COMPLETED': progress is 100%.
        2. If the project contains tasks (total tasks > 0):
           Task completion takes precedence as work deliverables:
           progress = round((count(tasks with status == 'DONE') / total_tasks) * 100)
        3. If no tasks exist yet (such as during project creation):
           a. If status is 'PLANNING': progress is 0% (project is still being planned).
           b. If status is 'ACTIVE' or 'ON_HOLD' and timeline dates (start_date, end_date) are provided:
              Calculate timeline elapsed percentage against today:
              - If today < start_date: 0% (project starts in the future).
              - If today >= end_date: 100% (timeline schedule is fully elapsed).
              - If start_date <= today < end_date:
                  elapsed_days = (today - start_date).days
                  total_days = (end_date - start_date).days
                  progress = round((elapsed_days / total_days) * 100)
           c. If no timeline dates are provided:
              Defaults to 0%.
        """
        normalized_status = (status or "").strip().upper()
        if normalized_status == "COMPLETED":
            return 100

        # When tasks are present, calculate by task completion ratio
        if tasks and len(tasks) > 0:
            done_count = sum(
                1 for t in tasks
                if (getattr(t, "status", None) or "").strip().upper() == "DONE"
            )
            return min(100, max(0, round((done_count / len(tasks)) * 100)))

        # When creating a project (0 tasks):
        if normalized_status == "PLANNING":
            return 0

        parsed_start = cls._parse_date(start_date)
        parsed_end = cls._parse_date(end_date)

        if parsed_start and parsed_end:
            today = datetime.now(timezone.utc).date()
            if today < parsed_start:
                return 0
            if today >= parsed_end:
                return 100
            total_days = (parsed_end - parsed_start).days
            if total_days <= 0:
                return 100 if today >= parsed_end else 0
            elapsed_days = (today - parsed_start).days
            calc_percent = round((elapsed_days / total_days) * 100)
            return min(100, max(0, calc_percent))

        return 0

    async def create_project(self, data: CreateProjectRequest, current_user: User) -> Project:
        """Create a new project with dynamically calculated progress. Enforces name uniqueness."""
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

        # Calculate progress dynamically rather than relying on a hardcoded value
        calculated_progress = self.calculate_project_progress(
            status=project_status,
            start_date=data.start_date,
            end_date=data.end_date,
            tasks=[],
        )

        new_project = Project(
            name=clean_name,
            key=key if key else None,
            description=data.description,
            status=project_status,
            progress=calculated_progress,
            tags=data.tags or [],
            columns=data.columns or [],
            start_date=data.start_date,
            end_date=data.end_date,
            created_by=creator_id,
        )
        created_project = await self.project_repo.create(new_project)

        # Build list of members to assign: owner/creator + any members specified in data.members
        member_ids_to_assign: List[uuid.UUID] = [creator_id]
        if data.members:
            for m_id in data.members:
                if isinstance(m_id, str):
                    try:
                        m_id = uuid.UUID(m_id)
                    except ValueError:
                        continue
                if m_id not in member_ids_to_assign:
                    member_ids_to_assign.append(m_id)

        for m_id in member_ids_to_assign:
            # Verify user exists before assigning to prevent foreign key violations that abort Postgres transactions
            existing_user = await self.user_repo.get_by_id(m_id)
            if not existing_user:
                logger.warning("Skipping member association: user %s does not exist", m_id)
                continue

            try:
                await self.project_repo.assign_projects_to_user(m_id, [created_project.id])
            except Exception as exc:
                try:
                    await self.db.rollback()
                except Exception:
                    pass
                logger.warning("Could not associate member %s during project creation: %s", m_id, exc)

        refetched = await self.project_repo.get_by_id(created_project.id)
        logger.info("User %s created project '%s' (%s)", current_user.email, created_project.name, created_project.id)

        # Log activity
        await self.activity_service.log_activity(
            type="PROJECT_CREATED",
            user_id=current_user.id,
            project_id=created_project.id,
            details=created_project.name,
        )

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
        elif any(f is not None for f in (data.status, data.start_date, data.end_date)):
            eff_status = updates.get("status", project.status)
            eff_start = updates.get("start_date", project.start_date)
            eff_end = updates.get("end_date", project.end_date)
            updates["progress"] = self.calculate_project_progress(
                status=eff_status,
                start_date=eff_start,
                end_date=eff_end,
                tasks=project.tasks or [],
            )
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

        # Log activity
        eff_project = updated_project or project
        await self.activity_service.log_activity(
            type="PROJECT_UPDATED",
            user_id=current_user.id,
            project_id=project_id,
            details=eff_project.name,
        )

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
