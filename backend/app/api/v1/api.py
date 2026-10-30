"""API Version 1 Router Aggregator."""

from fastapi import APIRouter
from app.api.v1.routers.activities import activities_router
from app.api.v1.routers.admin import admin_router
from app.api.v1.routers.analytics import analytics_router
from app.api.v1.routers.auth import auth_router
from app.api.v1.routers.comments import comments_router
from app.api.v1.routers.health import health_router
from app.api.v1.routers.projects import projects_router
from app.api.v1.routers.tasks import tasks_router
from app.api.v1.routers.users import users_router

# Base API router mounted under /taskboard/api/v1
api_v1_router = APIRouter(prefix="/taskboard/api/v1")

# Health Check (/taskboard/api/v1/health)
api_v1_router.include_router(health_router, tags=["Health"])

# Authentication (/taskboard/api/v1/auth/login, /refresh, /logout, /me, /setup-password)
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])

# Member Administration (/taskboard/api/v1/admin/users)
api_v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])

# Project Management (/taskboard/api/v1/projects)
api_v1_router.include_router(projects_router, prefix="/projects", tags=["Projects"])

# Task Management (/taskboard/api/v1/tasks)
api_v1_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])

# Comments (/taskboard/api/v1/tasks/{task_id}/comments, /comments/{comment_id})
api_v1_router.include_router(comments_router, tags=["Comments"])

# Analytics (/taskboard/api/v1/analytics)
api_v1_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])

# Activities (/taskboard/api/v1/activities)
api_v1_router.include_router(activities_router, prefix="/activities", tags=["Activities"])

# User Assignments (/taskboard/api/v1/users/{user_id}/assign-projects)
api_v1_router.include_router(users_router, prefix="/users", tags=["User Project Assignments"])
