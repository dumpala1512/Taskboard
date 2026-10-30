"""Task Service handling task creation, project/assignee validation, and cache invalidation."""

import logging
from typing import List, Optional, Tuple, Union
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.project_repository import ProjectRepository
from app.dao.task_repository import TaskRepository
from app.dao.user_repository import UserRepository
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.task import CreateTaskRequest, UpdateTaskRequest
from app.services.activity_service import ActivityService
from app.utils.redis import get_redis_client

logger = logging.getLogger(__name__)


class TaskService:
    """Service handling task business operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)
        self.activity_service = ActivityService(db)

    @classmethod
    def get_allowed_statuses_for_project(cls, project: Optional[Project]) -> set[str]:
        """Compute the set of valid task statuses combining standard defaults and project columns."""
        allowed = {"BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"}
        if project and getattr(project, "columns", None):
            for col in project.columns:
                if isinstance(col, dict) and col.get("id"):
                    allowed.add(str(col["id"]).strip().upper())
                elif isinstance(col, str) and col.strip():
                    allowed.add(col.strip().upper())
        return allowed

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

        # 3. Validate Task Status against Project Columns
        target_status = (data.status or "TODO").strip().upper()
        allowed_statuses = self.get_allowed_statuses_for_project(project)
        if target_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": f"Status '{data.status}' is invalid. Allowed statuses for this project are: {', '.join(sorted(allowed_statuses))}",
                    "error": {"code": "INVALID_TASK_STATUS"},
                    "code": "INVALID_TASK_STATUS",
                },
            )

        # 4. Create Task entity
        task = Task(
            project_id=data.project_id,
            title=data.title.strip(),
            description=data.description,
            status=target_status,
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

        # 5. Sync project progress and invalidate cache
        await self._sync_project_progress(data.project_id)
        await self.invalidate_dashboard_analytics_cache(data.project_id)

        # 6. Log activity
        await self.activity_service.log_activity(
            type="TASK_CREATED",
            user_id=current_user.id,
            project_id=created_task.project_id,
            task_id=created_task.id,
            task_title=created_task.title,
            details=created_task.title,
        )

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

        # Normalize and validate uppercase fields
        if "status" in update_dict and update_dict["status"]:
            target_status = update_dict["status"].strip().upper()
            allowed_statuses = self.get_allowed_statuses_for_project(project)
            if target_status not in allowed_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": f"Status '{update_dict['status']}' is invalid. Allowed statuses for this project are: {', '.join(sorted(allowed_statuses))}",
                        "error": {"code": "INVALID_TASK_STATUS"},
                        "code": "INVALID_TASK_STATUS",
                    },
                )
            update_dict["status"] = target_status
        if "priority" in update_dict and update_dict["priority"]:
            update_dict["priority"] = update_dict["priority"].strip().upper()

        old_status = task.status
        old_title = task.title
        project_id = task.project_id

        updated_task = await self.task_repo.update(task_id, update_dict)
        await self._sync_project_progress(task.project_id)
        await self.invalidate_dashboard_analytics_cache(task.project_id)

        eff_task = updated_task or task
        new_status = eff_task.status
        if new_status != old_status:
            act_type = "TASK_COMPLETED" if new_status.upper() == "DONE" else "TASK_STATUS_CHANGED"
            details = f"Moved \"{eff_task.title}\" from {old_status} to {new_status}"
            await self.activity_service.log_activity(
                type=act_type,
                user_id=current_user.id,
                project_id=eff_task.project_id,
                task_id=eff_task.id,
                from_status=old_status,
                to_status=new_status,
                task_title=eff_task.title,
                details=details,
            )
        else:
            await self.activity_service.log_activity(
                type="TASK_UPDATED",
                user_id=current_user.id,
                project_id=eff_task.project_id,
                task_id=eff_task.id,
                task_title=eff_task.title,
                details=f"Updated \"{eff_task.title}\"",
            )

        return eff_task

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
        task_title = task.title
        deleted = await self.task_repo.delete(task_id)
        await self._sync_project_progress(project_id)
        await self.invalidate_dashboard_analytics_cache(project_id)

        # Log activity
        await self.activity_service.log_activity(
            type="TASK_DELETED",
            user_id=current_user.id,
            project_id=project_id,
            task_id=task_id,
            task_title=task_title,
            details=f"Deleted task \"{task_title}\"",
        )

        return deleted

    async def _sync_project_progress(self, project_id: uuid.UUID) -> None:
        """Sync parent project progress based on its tasks and timeline."""
        try:
            from app.services.project_service import ProjectService
            project = await self.project_repo.get_by_id(project_id)
            if not project:
                return
            tasks = project.tasks or []
            new_prog = ProjectService.calculate_project_progress(
                status=project.status,
                start_date=project.start_date,
                end_date=project.end_date,
                tasks=tasks,
            )
            if project.progress != new_prog:
                await self.project_repo.update(project_id, {"progress": new_prog})
        except Exception as exc:
            logger.warning("Could not sync project progress for %s: %s", project_id, exc)

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
