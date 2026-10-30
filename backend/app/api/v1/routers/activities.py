"""Activities Router for retrieving activity feeds."""

from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import bearer_scheme, get_current_user
from app.models.user import User
from app.schemas.activity import ActivitiesListResponseEnvelope
from app.services.activity_service import ActivityService

activities_router = APIRouter(tags=["Activities"])


async def require_authenticated_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that authenticates the user."""
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
        return await get_current_user(auth=auth, db=db)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "message": "Authentication is required to access this resource.",
                "error": {"code": "INVALID_AUTH_TOKEN"},
                "code": "INVALID_AUTH_TOKEN",
            },
        )


@activities_router.get(
    "",
    response_model=ActivitiesListResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Get Activities",
    description="Retrieve activity history scoped to the user with optional project filtering.",
)
async def get_activities(
    project_id: Optional[uuid.UUID] = Query(None, alias="projectId", description="Filter by project UUID"),
    limit: int = Query(50, ge=1, le=100, description="Max activities to return"),
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> ActivitiesListResponseEnvelope:
    """Retrieve activities feed."""
    service = ActivityService(db)
    items = await service.get_activities(
        current_user=current_user,
        project_id=project_id,
        limit=limit,
    )
    return ActivitiesListResponseEnvelope(
        success=True,
        message="Activities retrieved successfully",
        data=items,
    )

