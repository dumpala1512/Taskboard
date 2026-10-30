"""Activity Service for managing activity logs and retrieval."""

import logging
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.activity_repository import ActivityRepository
from app.dao.project_repository import ProjectRepository
from app.models.activity import Activity
from app.models.user import User
from app.schemas.activity import ActivityItem, ActivityUserData

logger = logging.getLogger(__name__)


class ActivityService:
    """Service handling audit trail logging and scoped activity feeds."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.activity_repo = ActivityRepository(session)
        self.project_repo = ProjectRepository(session)

    async def log_activity(
        self,
        type: str,
        user_id: Optional[uuid.UUID],
        details: str,
        project_id: Optional[uuid.UUID] = None,
        task_id: Optional[uuid.UUID] = None,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        task_title: Optional[str] = None,
    ) -> Optional[Activity]:
        """Safely record an activity entry in the audit trail without raising uncaught exceptions."""
        try:
            activity = Activity(
                type=type,
                user_id=user_id,
                project_id=project_id,
                task_id=task_id,
                details=details,
                from_status=from_status,
                to_status=to_status,
                task_title=task_title,
            )
            return await self.activity_repo.create(activity)
        except Exception as e:
            logger.warning("Failed to log activity '%s': %s", type, e, exc_info=True)
            return None

    async def get_activities(
        self,
        current_user: User,
        project_id: Optional[uuid.UUID] = None,
        limit: int = 50,
    ) -> List[ActivityItem]:
        """Retrieve recent activities scoped to user permissions and optional project filter."""
        is_admin = current_user.role.lower() == "admin"

        if project_id is not None:
            project = await self.project_repo.get_by_id(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "The specified project could not be found.",
                        "error": {"code": "PROJECT_NOT_FOUND"},
                        "code": "PROJECT_NOT_FOUND",
                    },
                )

            if not is_admin:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have access to activities for this project.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )

            activities = await self.activity_repo.get_by_project_id(project_id, limit=limit)
        else:
            if is_admin:
                activities = await self.activity_repo.get_all(limit=limit)
            else:
                user_projects = await self.project_repo.get_all(
                    user_id=current_user.id,
                    is_admin=False,
                )
                user_project_ids = [p.id for p in user_projects]
                activities = await self.activity_repo.get_for_member(
                    user_id=current_user.id,
                    project_ids=user_project_ids,
                    limit=limit,
                )

        results: List[ActivityItem] = []
        for act in activities:
            user_name = (
                getattr(act.user, "name", None)
                or getattr(act.user, "full_name", None)
                or "Unknown User"
            ) if act.user else "Unknown User"
            user_avatar = getattr(act.user, "avatar", None) if act.user else None
            iso_time = act.created_at.isoformat() if act.created_at else ""

            results.append(
                ActivityItem(
                    id=str(act.id),
                    type=act.type,
                    user=ActivityUserData(name=user_name, avatar=user_avatar),
                    target=act.details,
                    details=act.details,
                    from_status=act.from_status,
                    to_status=act.to_status,
                    task_title=act.task_title,
                    project_id=str(act.project_id) if act.project_id else None,
                    task_id=str(act.task_id) if act.task_id else None,
                    timestamp=iso_time,
                    created_at=iso_time,
                )
            )

        return results
