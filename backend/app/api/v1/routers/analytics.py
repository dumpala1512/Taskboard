"""Analytics Router for dashboard metrics and visualizations."""

import logging
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)
analytics_router = APIRouter(tags=["Analytics"])
bearer_scheme = HTTPBearer(auto_error=False)


async def require_analytics_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that authenticates users for the analytics endpoint."""
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
                "error": {"code": "MISSING_AUTH_TOKEN"},
                "code": "MISSING_AUTH_TOKEN",
            },
        )


@analytics_router.get(
    "",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Analytics Data",
    description="Retrieves analytics data, including task status distribution, workload per assignee, and task completion trend for dashboard visualization.",
    responses={
        status.HTTP_200_OK: {"description": "Analytics data retrieved successfully."},
        status.HTTP_401_UNAUTHORIZED: {"description": "Authentication is required to access this resource."},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error while retrieving analytics data."},
    },
)
async def get_analytics(
    project_id: Optional[uuid.UUID] = Query(default=None, alias="projectId", description="Optional project filter"),
    current_user: User = Depends(require_analytics_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsResponse:
    """Retrieve task status distribution, assignee workloads, and completion trends."""
    try:
        service = AnalyticsService(db)
        analytics_data = await service.get_analytics(
            current_user=current_user,
            project_id=project_id,
        )
        return AnalyticsResponse(
            success=True,
            message="Analytics data retrieved successfully.",
            data=analytics_data,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Internal error while retrieving analytics data: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "An unexpected error occurred while generating analytics data.",
                "error": {"code": "INTERNAL_SERVER_ERROR"},
                "code": "INTERNAL_SERVER_ERROR",
            },
        )


