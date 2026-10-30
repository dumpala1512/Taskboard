"""Test Suite for Analytics API (GET /taskboard/api/v1/analytics).

Covers:
- Positive Response (200 OK with task status, workload, completion trend)
- 401 Unauthorized (missing or invalid token with MISSING_AUTH_TOKEN)
- Redis Cache Check and Hit
- Access control for Admin and Member
- Project filtering query parameter
"""

from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.task import Task
from app.models.user import User
from app.services.auth_service import token_service


@pytest.fixture
def admin_user() -> User:
    return User(
        id=uuid.uuid4(),
        full_name="Workspace Admin",
        email="admin@taskboard.com",
        password_hash="admin_hash",
        role="admin",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def member_user() -> User:
    return User(
        id=uuid.uuid4(),
        full_name="John Doe",
        email="john@taskboard.com",
        password_hash="member_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def second_member_user() -> User:
    return User(
        id=uuid.uuid4(),
        full_name="Jane Smith",
        email="jane@taskboard.com",
        password_hash="member2_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ==============================================================================
# 1. Negative Scenario: 401 Unauthorized
# ==============================================================================
@pytest.mark.asyncio
async def test_get_analytics_unauthorized_missing_token(async_client: AsyncClient):
    """Calling GET /analytics without token returns 401 Unauthorized with MISSING_AUTH_TOKEN."""
    response = await async_client.get("/taskboard/api/v1/analytics")

    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Authentication is required to access this resource."
    assert data["error"] == {"code": "MISSING_AUTH_TOKEN"}


# ==============================================================================
# 2. Positive Scenario: 200 OK (Admin & Member Access)
# ==============================================================================
@pytest.mark.asyncio
async def test_get_analytics_success(
    async_client: AsyncClient,
    admin_user: User,
    member_user: User,
    second_member_user: User,
):
    """Authenticated user retrieves aggregated analytics from database on cache miss."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    proj_id = uuid.uuid4()

    # Sample tasks across statuses and assignees
    task_todo = Task(
        id=uuid.uuid4(),
        project_id=proj_id,
        title="Todo Task",
        status="TODO",
        priority="HIGH",
        assignee_id=member_user.id,
        created_at=datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc),
        tags=[],
    )
    task_in_progress = Task(
        id=uuid.uuid4(),
        project_id=proj_id,
        title="In Progress Task",
        status="IN_PROGRESS",
        priority="MEDIUM",
        assignee_id=second_member_user.id,
        created_at=datetime(2026, 10, 21, 12, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 21, 12, 0, tzinfo=timezone.utc),
        tags=[],
    )
    task_done = Task(
        id=uuid.uuid4(),
        project_id=proj_id,
        title="Done Task",
        status="DONE",
        priority="LOW",
        assignee_id=member_user.id,
        created_at=datetime(2026, 10, 22, 14, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 22, 16, 0, tzinfo=timezone.utc),
        tags=[],
    )
    task_review = Task(
        id=uuid.uuid4(),
        project_id=proj_id,
        title="Review Task",
        status="REVIEW",
        priority="HIGH",
        assignee_id=second_member_user.id,
        created_at=datetime(2026, 10, 23, 9, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 23, 9, 0, tzinfo=timezone.utc),
        tags=[],
    )

    mock_redis = AsyncMock()
    # Cache miss
    mock_redis.get.return_value = None

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.user_repository.UserRepository.get_all", new_callable=AsyncMock) as mock_get_all_users, \
         patch("app.dao.task_repository.TaskRepository.get_all", new_callable=AsyncMock) as mock_get_tasks, \
         patch("app.services.analytics_service.get_redis_client", return_value=mock_redis):

        mock_get_user.return_value = admin_user
        mock_get_all_users.return_value = [admin_user, member_user, second_member_user]
        mock_get_tasks.return_value = [task_todo, task_in_progress, task_review, task_done]

        response = await async_client.get(
            "/taskboard/api/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Analytics data retrieved successfully."

        # Verify task_status distribution
        status_data = data["data"]["task_status"]
        assert status_data["todo"] == 1
        assert status_data["in_progress"] == 1
        assert status_data["in_review"] == 1
        assert status_data["done"] == 1

        # Verify workload
        workload = data["data"]["workload"]
        assert len(workload) == 2
        # Jane Smith has 2 tasks (task_in_progress + task_review)
        assert workload[0]["user_name"] == "Jane Smith"
        assert workload[0]["assigned_tasks"] == 2
        # John Doe has 2 tasks (task_todo + task_done)
        assert workload[1]["user_name"] == "John Doe"
        assert workload[1]["assigned_tasks"] == 2

        # Verify completion trend
        trend = data["data"]["completion_trend"]
        assert len(trend) == 1
        assert trend[0]["date"] == "2026-10-22"
        assert trend[0]["completed_tasks"] == 1

        # Verify Redis set was invoked
        mock_redis.set.assert_called_once()


@pytest.mark.asyncio
async def test_get_analytics_member_access(async_client: AsyncClient, member_user: User):
    """Member role can also access analytics endpoint (200 OK)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.user_repository.UserRepository.get_all", new_callable=AsyncMock) as mock_get_all_users, \
         patch("app.dao.task_repository.TaskRepository.get_all", new_callable=AsyncMock) as mock_get_tasks, \
         patch("app.services.analytics_service.get_redis_client", return_value=mock_redis):

        mock_get_user.return_value = member_user
        mock_get_all_users.return_value = [member_user]
        mock_get_tasks.return_value = []

        response = await async_client.get(
            "/taskboard/api/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["task_status"]["todo"] == 0
        assert data["data"]["task_status"]["done"] == 0


# ==============================================================================
# 3. Redis Cache Hit Flow
# ==============================================================================
@pytest.mark.asyncio
async def test_get_analytics_redis_cache_hit(async_client: AsyncClient, admin_user: User):
    """When data is cached in Redis, it is served directly without querying database."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    cached_payload = {
        "task_status": {"todo": 12, "in_progress": 8, "done": 25},
        "workload": [
            {
                "user_id": str(uuid.uuid4()),
                "user_name": "John Doe",
                "assigned_tasks": 8,
            }
        ],
        "completion_trend": [
            {"date": "2026-10-20", "completed_tasks": 5},
            {"date": "2026-10-21", "completed_tasks": 8},
        ],
    }

    mock_redis = AsyncMock()
    mock_redis.get.return_value = json.dumps(cached_payload)

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_all", new_callable=AsyncMock) as mock_get_tasks, \
         patch("app.services.analytics_service.get_redis_client", return_value=mock_redis):

        mock_get_user.return_value = admin_user

        response = await async_client.get(
            "/taskboard/api/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["task_status"]["todo"] == 12
        assert data["data"]["task_status"]["in_progress"] == 8
        assert data["data"]["task_status"]["done"] == 25
        assert data["data"]["workload"][0]["user_name"] == "John Doe"
        assert len(data["data"]["completion_trend"]) == 2

        # Database queries were skipped due to cache hit
        mock_get_tasks.assert_not_called()


# ==============================================================================
# 4. Project Filter Query Parameter
# ==============================================================================
@pytest.mark.asyncio
async def test_get_analytics_with_project_filter(async_client: AsyncClient, admin_user: User):
    """Query parameter ?projectId filters tasks by specific project."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    target_project_id = uuid.uuid4()
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.user_repository.UserRepository.get_all", new_callable=AsyncMock) as mock_get_all_users, \
         patch("app.dao.task_repository.TaskRepository.get_by_project", new_callable=AsyncMock) as mock_get_by_proj, \
         patch("app.dao.task_repository.TaskRepository.get_all", new_callable=AsyncMock) as mock_get_all_tasks, \
         patch("app.services.analytics_service.get_redis_client", return_value=mock_redis):

        mock_get_user.return_value = admin_user
        mock_get_all_users.return_value = [admin_user]
        mock_get_by_proj.return_value = []

        response = await async_client.get(
            f"/taskboard/api/v1/analytics?projectId={target_project_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        mock_get_by_proj.assert_called_once_with(target_project_id)
        mock_get_all_tasks.assert_not_called()


# ==============================================================================
# 5. Negative Scenario: 500 Internal Server Error
# ==============================================================================
@pytest.mark.asyncio
async def test_get_analytics_internal_server_error(async_client: AsyncClient, admin_user: User):
    """When an unexpected internal exception occurs, endpoint returns 500 Internal Server Error."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.services.analytics_service.AnalyticsService.get_analytics", new_callable=AsyncMock) as mock_service:

        mock_get_user.return_value = admin_user
        mock_service.side_effect = RuntimeError("Database connection crashed unexpectedly")

        response = await async_client.get(
            "/taskboard/api/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert data["code"] == "INTERNAL_SERVER_ERROR"
        assert data["error"] == {"code": "INTERNAL_SERVER_ERROR"}
        assert "unexpected error occurred" in data["message"].lower()


