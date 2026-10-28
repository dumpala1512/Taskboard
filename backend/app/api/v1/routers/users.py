"""Users Router for user-related actions such as project assignments."""

import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.project import (
    AssignProjectsRequest,
    AssignProjectsResponse,
    RemoveProjectAssignmentRequest,
    RemoveProjectAssignmentResponse,
)
from app.services.project_service import ProjectService

users_router = APIRouter(tags=["User Project Assignments"])


@users_router.post(
    "/{user_id}/assign-projects",
    response_model=AssignProjectsResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign Projects",
    description="Assigns one or more projects to a user. Restricted to administrators.",
    responses={
        status.HTTP_200_OK: {
            "description": "Projects assigned successfully."
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "The specified user or one or more projects could not be found.",
        },
        status.HTTP_409_CONFLICT: {
            "description": "User is already assigned to this project.",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "User is already assigned to this project.",
                        "error": "USER_ALREADY_ASSIGNED",
                        "code": "USER_ALREADY_ASSIGNED",
                    }
                }
            },
        },
    },
)
async def assign_projects_to_user(
    user_id: uuid.UUID,
    payload: AssignProjectsRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AssignProjectsResponse:
    """Assign specified projects to a target user account."""
    service = ProjectService(db)
    assigned_count = await service.assign_projects(user_id=user_id, project_ids=payload.project_ids)
    return AssignProjectsResponse(
        success=True,
        message="Projects assigned successfully.",
        data={
            "user_id": str(user_id),
            "assigned_projects": assigned_count,
        },
    )


@users_router.delete(
    "/{user_id}/assign-projects",
    response_model=RemoveProjectAssignmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove Project Assignment",
    description="Removes a project assignment from a user. Restricted to administrators.",
)
async def remove_project_assignment_from_user(
    user_id: uuid.UUID,
    payload: RemoveProjectAssignmentRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> RemoveProjectAssignmentResponse:
    """Remove project membership from a user account."""
    service = ProjectService(db)
    await service.remove_project_assignment(user_id=user_id, project_id=payload.project_id)
    return RemoveProjectAssignmentResponse(
        success=True,
        message="Project assignment removed successfully.",
    )
