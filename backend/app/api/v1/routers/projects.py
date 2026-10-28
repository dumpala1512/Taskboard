"""Projects Router for creating and managing workspace projects."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.user import User
from app.schemas.project import (
    CreateProjectRequest,
    ProjectData,
    ProjectResponseEnvelope,
    ProjectsListResponseEnvelope,
    UpdateProjectRequest,
)
from app.services.project_service import ProjectService

projects_router = APIRouter(tags=["Projects"])


@projects_router.post(
    "",
    response_model=ProjectResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project",
    description="Creates a new project. Restricted to administrators.",
)
async def create_project(
    payload: CreateProjectRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponseEnvelope:
    """Create a new project workspace."""
    service = ProjectService(db)
    project = await service.create_project(data=payload, current_user=current_admin)
    return ProjectResponseEnvelope(
        success=True,
        message="Project created successfully.",
        data=ProjectData.model_validate(project),
    )


@projects_router.get(
    "",
    response_model=ProjectsListResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Get All Projects",
    description="Retrieves all projects accessible to the authenticated user.",
)
async def get_all_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectsListResponseEnvelope:
    """Retrieve all projects accessible to the caller."""
    service = ProjectService(db)
    projects = await service.get_all_projects(current_user=current_user)
    data = [ProjectData.model_validate(p) for p in projects]
    return ProjectsListResponseEnvelope(
        success=True,
        message="Projects retrieved successfully.",
        data=data,
    )


@projects_router.get(
    "/{project_id}",
    response_model=ProjectResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Get Project by ID",
    description="Retrieves details of a specific project. Accessible by admins or assigned members.",
)
async def get_project_by_id(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponseEnvelope:
    """Fetch a single project by UUID."""
    service = ProjectService(db)
    project = await service.get_project_by_id(project_id=project_id, current_user=current_user)
    return ProjectResponseEnvelope(
        success=True,
        message="Project retrieved successfully.",
        data=ProjectData.model_validate(project),
    )


@projects_router.patch(
    "/{project_id}",
    response_model=ProjectResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Update Project",
    description="Updates an existing project. Restricted to administrators.",
)
async def update_project(
    project_id: uuid.UUID,
    payload: UpdateProjectRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponseEnvelope:
    """Update project details."""
    service = ProjectService(db)
    updated = await service.update_project(project_id=project_id, data=payload, current_user=current_admin)
    return ProjectResponseEnvelope(
        success=True,
        message="Project updated successfully.",
        data=ProjectData.model_validate(updated),
    )


@projects_router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project",
    description="Deletes an existing project. Restricted to administrators.",
    responses={
        status.HTTP_204_NO_CONTENT: {
            "description": "Project deleted successfully. No response body."
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "The requested project could not be found.",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "The requested project could not be found.",
                        "error": "NOT_FOUND",
                    }
                }
            },
        },
    },
)
async def delete_project(
    project_id: uuid.UUID,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Permanently delete a project. Returns 204 No Content or raises 404 if project is not found."""
    service = ProjectService(db)
    project = await service.project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested project could not be found.",
        )

    await service.delete_project(project_id=project_id, current_user=current_admin, project=project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
