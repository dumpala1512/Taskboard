"""Task Service handling task creation, project/assignee validation, and cache invalidation."""

import logging
from typing import List, Optional, Tuple, Union
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.project_repository import ProjectRepository
from app.dao.task_repository import TaskRepository
from app.dao.user_repository import UserRepository
from app.models.task import Task
from app.models.user import User
from app.schemas.task import CreateTaskRequest, UpdateTaskRequest
from app.utils.redis import get_redis_client

logger = logging.getLogger(__name__)


class TaskService:
    """Service handling task business operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)

    async def create_task(self, data: CreateTaskRequest, current_user: User) -> Task:
        """Create a new task within a project.

        Validates that the project and optional assignee exist.
        Invalidates dashboard and analytics caches upon creation.
        """
        # 1. Verify Project exists
        project = await self.project_repo.get_by_id(data.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "The specified project or assignee could not be found.",
                    "error": {"code": "RESOURCE_NOT_FOUND"},
                    "code": "RESOURCE_NOT_FOUND",
                },
            )

        # 2. Verify Assignee exists (if provided) and is part of the project
        if data.assignee_id:
            assignee = await self.user_repo.get_by_id(data.assignee_id)
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "The specified project or assignee could not be found.",
                        "error": {"code": "RESOURCE_NOT_FOUND"},
                        "code": "RESOURCE_NOT_FOUND",
                    },
                )

            # Verify that the assignee belongs to the project (owner or member)
            is_owner = str(project.created_by) == str(data.assignee_id)
            is_member = any(str(m.id) == str(data.assignee_id) for m in (project.members or []))
            if not is_owner and not is_member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": "Add the member to the project and then assign task",
                        "error": {"code": "ASSIGNEE_NOT_IN_PROJECT"},
                        "code": "ASSIGNEE_NOT_IN_PROJECT",
                    },
                )

        # 3. Create Task entity
        task = Task(
            project_id=data.project_id,
            title=data.title.strip(),
            description=data.description,
            status=(data.status or "TODO").strip().upper(),
            priority=(data.priority or "MEDIUM").strip().upper(),
            assignee_id=data.assignee_id,
            due_date=data.due_date,
            tags=data.tags or [],
            start_date=data.start_date,
            estimated_time=data.estimated_time,
            task_type=data.task_type,
            points=data.points,
        )

        created_task = await self.task_repo.create(task)
        logger.info(
            "User %s created task '%s' (%s) in project %s",
            current_user.email,
            created_task.title,
            created_task.id,
            data.project_id,
        )

        # 4. Invalidate Dashboard and Analytics cache
        await self.invalidate_dashboard_analytics_cache(data.project_id)

        return created_task

    async def get_tasks(
        self,
        current_user: User,
        project_id: Optional[Union[uuid.UUID, str]] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        assignee_id: Optional[Union[uuid.UUID, str]] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Task], int]:
        """Fetch all tasks accessible to the caller with optional filtering and pagination.

        Returns:
            Tuple of (tasks_list, total_count)
        """
        is_admin = current_user.role.lower() == "admin"
        target_project_id = None

        if project_id:
            project = await self.project_repo.get_by_id(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "The specified project could not be found.",
                        "error": {"code": "RESOURCE_NOT_FOUND"},
                        "code": "RESOURCE_NOT_FOUND",
                    },
                )
            if not is_admin:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have permission to view tasks in this project.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )
            target_project_id = project.id

        return await self.task_repo.get_tasks(
            user_id=current_user.id,
            is_admin=is_admin,
            project_id=target_project_id,
            status=status_filter,
            priority=priority_filter,
            assignee_id=assignee_id,
            page=page,
            page_size=page_size,
        )

    async def get_task_by_id(self, task_id: uuid.UUID, current_user: User) -> Task:
        """Fetch a specific task by ID."""
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Task not found",
                    "error": {"code": "TASK_NOT_FOUND"},
                    "code": "TASK_NOT_FOUND",
                },
            )

        if current_user.role.lower() != "admin":
            project = await self.project_repo.get_by_id(task.project_id)
            if project:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have permission to view this task.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )

        return task

    async def update_task(
        self,
        task_id: uuid.UUID,
        data: UpdateTaskRequest,
        current_user: User,
    ) -> Task:
        """Update an existing task."""
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Task not found",
                    "error": {"code": "TASK_NOT_FOUND"},
                    "code": "TASK_NOT_FOUND",
                },
            )

        project = await self.project_repo.get_by_id(task.project_id)

        if current_user.role.lower() != "admin":
            if project:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have permission to update tasks in this project.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )

        # If assignee_id is updated (and not None)
        if data.assignee_id is not None:
            assignee = await self.user_repo.get_by_id(data.assignee_id)
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "The specified project or assignee could not be found.",
                        "error": {"code": "RESOURCE_NOT_FOUND"},
                        "code": "RESOURCE_NOT_FOUND",
                    },
                )
            if project:
                is_assignee_owner = str(project.created_by) == str(data.assignee_id)
                is_assignee_member = any(str(m.id) == str(data.assignee_id) for m in (project.members or []))
                if not is_assignee_owner and not is_assignee_member:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Add the member to the project and then assign task",
                            "error": {"code": "ASSIGNEE_NOT_IN_PROJECT"},
                            "code": "ASSIGNEE_NOT_IN_PROJECT",
                        },
                    )

        update_dict = data.model_dump(exclude_unset=True)

        # Non-nullable columns must never be overwritten with None or blank values in a partial update
        for non_nullable_field in ("title", "status", "priority"):
            if non_nullable_field in update_dict:
                val = update_dict[non_nullable_field]
                if val is None or (isinstance(val, str) and not val.strip()):
                    del update_dict[non_nullable_field]

        # Normalize uppercase fields
        if "status" in update_dict and update_dict["status"]:
            update_dict["status"] = update_dict["status"].strip().upper()
        if "priority" in update_dict and update_dict["priority"]:
            update_dict["priority"] = update_dict["priority"].strip().upper()

        updated_task = await self.task_repo.update(task_id, update_dict)
        await self.invalidate_dashboard_analytics_cache(task.project_id)
        return updated_task or task

    async def delete_task(self, task_id: uuid.UUID, current_user: User) -> bool:
        """Delete a task. Restricted to Administrators."""
        if current_user.role.lower() != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "Members are not permitted to delete tasks. Only administrators can delete tasks.",
                    "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                    "code": "INSUFFICIENT_PERMISSIONS",
                },
            )

        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Task not found",
                    "error": {"code": "TASK_NOT_FOUND"},
                    "code": "TASK_NOT_FOUND",
                },
            )

        project_id = task.project_id
        deleted = await self.task_repo.delete(task_id)
        await self.invalidate_dashboard_analytics_cache(project_id)
        return deleted

    async def invalidate_dashboard_analytics_cache(self, project_id: uuid.UUID) -> None:
        """Invalidate all Redis cache keys related to dashboard and analytics."""
        try:
            redis = get_redis_client()
            patterns = [
                "dashboard:*",
                "analytics:*",
                "tasks:*",
                f"*project*{project_id}*",
            ]
            for pattern in patterns:
                keys = await redis.keys(pattern)
                if keys:
                    await redis.delete(*keys)
            logger.info("Invalidated dashboard and analytics cache for project %s", project_id)
        except Exception as exc:
            logger.warning("Could not invalidate dashboard/analytics cache: %s", exc)
