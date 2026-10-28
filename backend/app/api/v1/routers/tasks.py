"""Tasks Router for creating, retrieving, updating, and deleting project tasks."""

import math
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import bearer_scheme, get_current_user
from app.models.user import User
from app.schemas.task import (
    CreateTaskRequest,
    PaginationMeta,
    TaskData,
    TaskResponseEnvelope,
    TasksListResponseEnvelope,
    UpdateTaskRequest,
)
from app.services.task_service import TaskService

tasks_router = APIRouter(tags=["Tasks"])


async def require_task_admin(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that authenticates the user and verifies Admin authority for task operations.

    Raises:
        401 Unauthorized if auth token is missing or invalid.
        403 Forbidden if user lacks admin role.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Authentication is required to access this resource.",
                "error": {"code": "MISSING_AUTH_TOKEN"},
                "code": "MISSING_AUTH_TOKEN",
            },
        )

    try:
        user = await get_current_user(auth=auth, db=db)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Authentication is required to access this resource.",
                "error": {"code": "MISSING_AUTH_TOKEN"},
                "code": "MISSING_AUTH_TOKEN",
            },
        )

    if user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "You do not have permission to create tasks.",
                "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                "code": "INSUFFICIENT_PERMISSIONS",
            },
        )

    return user


@tasks_router.post(
    "",
    response_model=TaskResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    summary="Create Task",
    description="Creates a new task within a project. Restricted to administrators.",
)
async def create_task(
    payload: CreateTaskRequest,
    current_admin: User = Depends(require_task_admin),
    db: AsyncSession = Depends(get_db),
) -> TaskResponseEnvelope:
    """Create a new task within a project."""
    service = TaskService(db)
    task = await service.create_task(data=payload, current_user=current_admin)
    return TaskResponseEnvelope(
        success=True,
        message="Task retrieved successfully.",
        data=TaskData.model_validate(task),
    )


@tasks_router.get(
    "",
    response_model=TasksListResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Get Tasks",
    description="Retrieve all tasks accessible to the authenticated user with optional filtering and pagination.",
)
async def get_tasks(
    request: Request,
    project_id: Optional[str] = Query(None, description="Filter by project"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Records per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TasksListResponseEnvelope:
    """Retrieve tasks with optional filtering (project, status, priority, assignee) and pagination."""
    effective_project_id = project_id or request.query_params.get("projectId")
    effective_assignee_id = assignee_id or request.query_params.get("assigneeId")
    legacy_page_size = request.query_params.get("pageSize")
    effective_page_size = int(legacy_page_size) if legacy_page_size and "page_size" not in request.query_params else page_size

    service = TaskService(db)
    tasks, total = await service.get_tasks(
        current_user=current_user,
        project_id=effective_project_id,
        status_filter=status,
        priority_filter=priority,
        assignee_id=effective_assignee_id,
        page=page,
        page_size=effective_page_size,
    )
    total_pages = math.ceil(total / effective_page_size) if total > 0 else 1
    data = [TaskData.model_validate(t) for t in tasks]
    return TasksListResponseEnvelope(
        success=True,
        message="Tasks retrieved successfully.",
        data=data,
        pagination=PaginationMeta(
            page=page,
            page_size=effective_page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@tasks_router.get(
    "/{task_id}",
    response_model=TaskResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Get Task by ID",
    description="Retrieve a single task by its UUID.",
)
async def get_task_by_id(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponseEnvelope:
    """Retrieve a single task by ID."""
    service = TaskService(db)
    task = await service.get_task_by_id(task_id=task_id, current_user=current_user)
    return TaskResponseEnvelope(
        success=True,
        message="Task retrieved successfully.",
        data=TaskData.model_validate(task),
    )


@tasks_router.patch(
    "/{task_id}",
    response_model=TaskResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Update Task",
    description="Updates task properties (status, assignee, priority, description, etc.).",
)
async def update_task(
    task_id: uuid.UUID,
    payload: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponseEnvelope:
    """Update task details."""
    service = TaskService(db)
    updated_task = await service.update_task(task_id=task_id, data=payload, current_user=current_user)
    return TaskResponseEnvelope(
        success=True,
        message="Task updated successfully.",
        data=TaskData.model_validate(updated_task),
    )


@tasks_router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Task",
    description="Deletes a task by ID. Restricted to administrators.",
)
async def delete_task(
    task_id: uuid.UUID,
    current_admin: User = Depends(require_task_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a task. Admin only."""
    service = TaskService(db)
    await service.delete_task(task_id=task_id, current_user=current_admin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
