"""Test Suite for POST /taskboard/api/v1/tasks.

Covers:
- Positive Response (201 Created with all required fields)
- 401 Unauthorized (missing or invalid auth token)
- 403 Forbidden (insufficient permissions for non-admin members)
- 404 Not Found (specified project does not exist)
- 404 Not Found (specified assignee does not exist)
- 422 Unprocessable Entity (missing required fields)
- Cache invalidation (dashboard/analytics cache)
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.project import Project
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
        full_name="Team Member",
        email="member@taskboard.com",
        password_hash="member_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_project(admin_user: User, member_user: User) -> Project:
    return Project(
        id=uuid.uuid4(),
        name="Backend Core",
        key="BC",
        description="Core services",
        status="ACTIVE",
        created_by=admin_user.id,
        members=[member_user],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_task(sample_project: Project, member_user: User) -> Task:
    return Task(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        title="Implement JWT Authentication",
        description="Develop login and token refresh functionality.",
        status="TODO",
        priority="HIGH",
        assignee_id=member_user.id,
        due_date="2026-11-15",
        tags=["backend", "authentication"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ==============================================================================
# Positive Scenario: 201 Created
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_success(
    async_client: AsyncClient,
    admin_user: User,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Admin can successfully create a task within a project (201 Created)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.create", new_callable=AsyncMock) as mock_create_task, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        # Admin user check and assignee check
        mock_get_user.side_effect = lambda u_id: admin_user if str(u_id) == str(admin_user.id) else member_user
        mock_get_project.return_value = sample_project
        mock_create_task.return_value = sample_task

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=["dashboard:stats", "analytics:overview"])
        fake_redis.delete = AsyncMock()
        mock_redis.return_value = fake_redis

        payload = {
            "project_id": str(sample_project.id),
            "title": "Implement JWT Authentication",
            "description": "Develop login and token refresh functionality.",
            "status": "TODO",
            "priority": "HIGH",
            "assignee_id": str(member_user.id),
            "due_date": "2026-11-15",
            "tags": ["backend", "authentication"],
        }

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Task retrieved successfully."
        task_data = data["data"]
        assert task_data["id"] == str(sample_task.id)
        assert task_data["project_id"] == str(sample_project.id)
        assert task_data["title"] == "Implement JWT Authentication"
        assert task_data["description"] == "Develop login and token refresh functionality."
        assert task_data["status"] == "TODO"
        assert task_data["priority"] == "HIGH"
        assert task_data["assignee_id"] == str(member_user.id)
        assert task_data["due_date"] == "2026-11-15"
        assert task_data["tags"] == ["backend", "authentication"]
        assert "created_at" in task_data
        assert "updated_at" in task_data

        # Verify Redis cache keys were cleared
        assert fake_redis.delete.called


@pytest.mark.asyncio
async def test_create_task_with_empty_optional_fields(
    async_client: AsyncClient,
    admin_user: User,
    sample_project: Project,
):
    """Admin can create a task when optional fields like assignee_id or due_date are empty strings."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    unassigned_task = Task(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        title="Unassigned Task with Empty Optional Strings",
        description=None,
        status="TODO",
        priority="MEDIUM",
        assignee_id=None,
        due_date=None,
        tags=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.create", new_callable=AsyncMock) as mock_create_task, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = sample_project
        mock_create_task.return_value = unassigned_task

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=[])
        mock_redis.return_value = fake_redis

        payload = {
            "project_id": str(sample_project.id),
            "title": "Unassigned Task with Empty Optional Strings",
            "assignee_id": "",  # Empty string from form or select
            "due_date": "",     # Empty string from date picker
            "start_date": "",
            "description": "",
            "task_type": "",
        }

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["assignee_id"] is None
        assert data["data"]["due_date"] is None



# ==============================================================================
# Negative Scenarios: 401 Unauthorized
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_unauthorized_missing_token(async_client: AsyncClient, sample_project: Project):
    """Attempting to create a task without token returns 401 with MISSING_AUTH_TOKEN."""
    response = await async_client.post(
        "/taskboard/api/v1/tasks",
        json={
            "project_id": str(sample_project.id),
            "title": "Unauthenticated Task",
        },
    )

    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Authentication is required to access this resource."
    assert data["error"] == {"code": "MISSING_AUTH_TOKEN"}


# ==============================================================================
# Negative Scenarios: 403 Forbidden
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_forbidden_for_member(
    async_client: AsyncClient, member_user: User, sample_project: Project
):
    """Standard member cannot create tasks (403 Forbidden with INSUFFICIENT_PERMISSIONS)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {member_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Unauthorized Task Creation",
            },
        )

        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
        assert data["message"] == "You do not have permission to create tasks."
        assert data["error"] == {"code": "INSUFFICIENT_PERMISSIONS"}


# ==============================================================================
# Negative Scenarios: 404 Not Found (Project or Assignee)
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_project_not_found(async_client: AsyncClient, admin_user: User):
    """Attempting to create a task in a non-existent project returns 404 RESOURCE_NOT_FOUND."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = None

        missing_project_id = str(uuid.uuid4())
        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": missing_project_id,
                "title": "Orphan Task",
            },
        )

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["message"] == "The specified project or assignee could not be found."
        assert data["error"] == {"code": "RESOURCE_NOT_FOUND"}


@pytest.mark.asyncio
async def test_create_task_assignee_not_found(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """Attempting to assign a task to a non-existent user returns 404 RESOURCE_NOT_FOUND."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    missing_assignee_id = str(uuid.uuid4())

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.side_effect = lambda u_id: admin_user if str(u_id) == str(admin_user.id) else None
        mock_get_project.return_value = sample_project

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Task with Ghost Assignee",
                "assignee_id": missing_assignee_id,
            },
        )

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["message"] == "The specified project or assignee could not be found."
        assert data["error"] == {"code": "RESOURCE_NOT_FOUND"}


# ==============================================================================
# Negative Scenario: 422 Unprocessable Entity
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_validation_error_missing_fields(
    async_client: AsyncClient, admin_user: User
):
    """Missing required fields (e.g. title or project_id) returns 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        # Payload missing both project_id and title
        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={},
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Validation Error"


@pytest.mark.asyncio
async def test_create_task_points_limit_exceeded(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """Estimation points cannot exceed 32 (returns 422 Unprocessable Entity)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Task with High Estimation Points",
                "points": 33,
            },
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False


@pytest.mark.asyncio
async def test_update_task_points_limit_exceeded(
    async_client: AsyncClient, admin_user: User, sample_task: Task
):
    """Updating estimation points to > 32 returns 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.patch(
            f"/taskboard/api/v1/tasks/{sample_task.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "points": 50,
            },
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False



@pytest.mark.asyncio
async def test_create_task_assignee_not_in_project(
    async_client: AsyncClient, admin_user: User, member_user: User
):
    """Attempting to assign a task to a user who is not a member of the project returns 400 Bad Request."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    other_user = User(
        id=uuid.uuid4(),
        full_name="External User",
        email="external@taskboard.com",
        password_hash="ext_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    project_without_user = Project(
        id=uuid.uuid4(),
        name="Private Project",
        key="PP",
        description="Restricted project",
        status="ACTIVE",
        created_by=admin_user.id,
        members=[member_user],  # other_user is NOT a member
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.side_effect = lambda u_id: admin_user if str(u_id) == str(admin_user.id) else other_user
        mock_get_project.return_value = project_without_user

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(project_without_user.id),
                "title": "Task for Non-Member",
                "assignee_id": str(other_user.id),
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["message"] == "Add the member to the project and then assign task"
        assert data["error"] == {"code": "ASSIGNEE_NOT_IN_PROJECT"}


# ==============================================================================
# GET /taskboard/api/v1/tasks Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_get_all_tasks_success(
    async_client: AsyncClient, admin_user: User, sample_task: Task
):
    """Authenticated user can fetch tasks list with default pagination metadata."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_tasks", new_callable=AsyncMock) as mock_get_tasks:

        mock_get_user.return_value = admin_user
        mock_get_tasks.return_value = ([sample_task], 1)

        response = await async_client.get(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Tasks retrieved successfully."
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == sample_task.title
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["page_size"] == 10
        assert data["pagination"]["total"] == 1
        assert data["pagination"]["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_tasks_scoped_to_project(
    async_client: AsyncClient, admin_user: User, sample_project: Project, sample_task: Task
):
    """Caller can fetch tasks filtered by projectId query param."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.get_tasks", new_callable=AsyncMock) as mock_get_tasks:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = sample_project
        mock_get_tasks.return_value = ([sample_task], 1)

        response = await async_client.get(
            f"/taskboard/api/v1/tasks?project_id={sample_project.id}&status=TODO&page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["page_size"] == 10
        assert data["pagination"]["total"] == 1


@pytest.mark.asyncio
async def test_get_tasks_with_all_query_filters(
    async_client: AsyncClient,
    admin_user: User,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Caller can filter by project_id, status, priority, assignee_id, page, and page_size."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.get_tasks", new_callable=AsyncMock) as mock_get_tasks:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = sample_project
        mock_get_tasks.return_value = ([sample_task], 25)

        response = await async_client.get(
            f"/taskboard/api/v1/tasks?project_id={sample_project.id}&status=TODO&priority=HIGH&assignee_id={member_user.id}&page=2&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["page_size"] == 10
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 3

        mock_get_tasks.assert_called_once_with(
            user_id=admin_user.id,
            is_admin=True,
            project_id=sample_project.id,
            status="TODO",
            priority="HIGH",
            assignee_id=str(member_user.id),
            page=2,
            page_size=10,
        )


@pytest.mark.asyncio
async def test_get_tasks_project_not_found(async_client: AsyncClient, admin_user: User):
    """GET /tasks with a non-existent project_id returns 404."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = None

        response = await async_client.get(
            f"/taskboard/api/v1/tasks?project_id={uuid.uuid4()}&status=TODO&page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "RESOURCE_NOT_FOUND"



# ==============================================================================
# PATCH /taskboard/api/v1/tasks/{task_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_update_task_success(
    async_client: AsyncClient, admin_user: User, sample_project: Project, sample_task: Task
):
    """User can update task fields (status, priority, title)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    updated_task = Task(
        id=sample_task.id,
        project_id=sample_project.id,
        title="Updated Task Title",
        description="Updated description",
        status="IN_PROGRESS",
        priority="HIGH",
        assignee_id=sample_task.assignee_id,
        due_date=sample_task.due_date,
        tags=["frontend"],
        created_at=sample_task.created_at,
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.update", new_callable=AsyncMock) as mock_update, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        mock_get_user.return_value = admin_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project
        mock_update.return_value = updated_task

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=[])
        mock_redis.return_value = fake_redis

        response = await async_client.patch(
            f"/taskboard/api/v1/tasks/{sample_task.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "Updated Task Title",
                "status": "IN_PROGRESS",
                "tags": ["frontend"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Task updated successfully."
        assert data["data"]["title"] == "Updated Task Title"
        assert data["data"]["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_update_task_preserves_title_when_null_in_payload(
    async_client: AsyncClient, admin_user: User, sample_project: Project, sample_task: Task
):
    """PATCH with null title/status/priority updates description without overwriting non-null columns."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.task_repository.TaskRepository.update", new_callable=AsyncMock) as mock_update, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        mock_get_user.return_value = admin_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project
        mock_update.return_value = sample_task

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=[])
        mock_redis.return_value = fake_redis

        response = await async_client.patch(
            f"/taskboard/api/v1/tasks/{sample_task.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": None,
                "description": "vc dsiu u  dsub diubid vuidfvb ddf",
                "status": None,
                "priority": None,
            },
        )

        assert response.status_code == 200
        called_updates = mock_update.call_args[0][1]
        assert "title" not in called_updates
        assert "status" not in called_updates
        assert "priority" not in called_updates
        assert called_updates["description"] == "vc dsiu u  dsub diubid vuidfvb ddf"



@pytest.mark.asyncio
async def test_update_task_not_found(async_client: AsyncClient, admin_user: User):
    """Updating a non-existent task returns 404."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task:

        mock_get_user.return_value = admin_user
        mock_get_task.return_value = None

        response = await async_client.patch(
            f"/taskboard/api/v1/tasks/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": "Non-existent task"},
        )

        assert response.status_code == 404
        assert response.json()["success"] is False


# ==============================================================================
# DELETE /taskboard/api/v1/tasks/{task_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_delete_task_success(
    async_client: AsyncClient, admin_user: User, sample_task: Task
):
    """Admin can delete a task (204 No Content)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.task_repository.TaskRepository.delete", new_callable=AsyncMock) as mock_delete, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        mock_get_user.return_value = admin_user
        mock_get_task.return_value = sample_task
        mock_delete.return_value = True

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=[])
        mock_redis.return_value = fake_redis

        response = await async_client.delete(
            f"/taskboard/api/v1/tasks/{sample_task.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_task_forbidden_for_member(
    async_client: AsyncClient, member_user: User, sample_task: Task
):
    """Standard member cannot delete a task (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.delete(
            f"/taskboard/api/v1/tasks/{sample_task.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
        assert data["error"] == {"code": "INSUFFICIENT_PERMISSIONS"}


# ==============================================================================
# Task Status Validation against Project Columns Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_create_task_invalid_status_rejected(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """Submitting an arbitrary/unnamed status string returns 400 Bad Request with INVALID_TASK_STATUS."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = sample_project

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Task with Random Status",
                "status": "some random unnamed string",
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"] == {"code": "INVALID_TASK_STATUS"}
        assert "is invalid" in data["message"]


@pytest.mark.asyncio
async def test_create_task_custom_project_column_status_accepted(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """When a project defines custom columns, tasks with that column ID are accepted."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    # Project with custom columns added by admin
    sample_project.columns = [
        {"id": "TODO", "title": "To Do"},
        {"id": "QA_TESTING", "title": "QA Testing"},
        {"id": "DONE", "title": "Done"},
    ]

    created_custom_task = Task(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        title="Custom Status Task",
        status="QA_TESTING",
        priority="MEDIUM",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        tags=[],
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.task_repository.TaskRepository.create", new_callable=AsyncMock) as mock_create, \
         patch("app.services.task_service.get_redis_client") as mock_redis:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = sample_project
        mock_create.return_value = created_custom_task

        fake_redis = AsyncMock()
        fake_redis.keys = AsyncMock(return_value=[])
        mock_redis.return_value = fake_redis

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Custom Status Task",
                "status": "QA_TESTING",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "QA_TESTING"


@pytest.mark.asyncio
async def test_create_task_invalid_priority_rejected(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """Submitting an invalid priority like 'lendf' returns 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Task with Invalid Priority",
                "priority": "lendf",
            },
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Validation Error"


@pytest.mark.asyncio
async def test_create_task_invalid_task_type_rejected(
    async_client: AsyncClient, admin_user: User, sample_project: Project
):
    """Submitting an invalid task type returns 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.post(
            "/taskboard/api/v1/tasks",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "project_id": str(sample_project.id),
                "title": "Task with Invalid Type",
                "taskType": "RandomType",
            },
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Validation Error"


