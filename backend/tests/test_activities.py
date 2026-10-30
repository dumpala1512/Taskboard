"""Test Suite for Activities API (GET /taskboard/api/v1/activities) and Activity Emission.

Covers:
- Positive Response: Admin retrieves all activities
- Scoped Response: Project-filtered activities
- Member Access Control: Member retrieves only their accessible activities
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: Member accesses project activities they are not part of
- 404 Not Found: Project does not exist
- Activity logging integration on tasks and projects
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.activity import Activity
from app.models.project import Project
from app.models.user import User
from app.services.auth_service import token_service


@pytest.fixture
def admin_user() -> User:
    return User(
        id=uuid.uuid4(),
        full_name="Admin User",
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
        full_name="Member User",
        email="member@taskboard.com",
        password_hash="member_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def non_member_user() -> User:
    return User(
        id=uuid.uuid4(),
        full_name="External User",
        email="external@taskboard.com",
        password_hash="external_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_project(admin_user: User, member_user: User) -> Project:
    return Project(
        id=uuid.uuid4(),
        name="Platform Core",
        key="PC",
        description="Core platform services",
        status="ACTIVE",
        created_by=admin_user.id,
        members=[member_user],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_activity(admin_user: User, sample_project: Project) -> Activity:
    return Activity(
        id=uuid.uuid4(),
        type="TASK_STATUS_CHANGED",
        user_id=admin_user.id,
        project_id=sample_project.id,
        task_id=uuid.uuid4(),
        details="Moved 'Task 1' from TODO to IN_PROGRESS",
        from_status="TODO",
        to_status="IN_PROGRESS",
        task_title="Task 1",
        created_at=datetime.now(timezone.utc),
        user=admin_user,
        project=sample_project,
    )


@pytest.mark.asyncio
async def test_get_activities_admin_success(
    async_client: AsyncClient,
    admin_user: User,
    sample_activity: Activity,
):
    """Admin can fetch all activities across the platform."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.activity_repository.ActivityRepository.get_all", new_callable=AsyncMock) as mock_get_all:

        mock_get_user.return_value = admin_user
        mock_get_all.return_value = [sample_activity]

        response = await async_client.get(
            "/taskboard/api/v1/activities",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "Activities retrieved successfully"
        assert len(body["data"]) == 1
        item = body["data"][0]
        assert item["id"] == str(sample_activity.id)
        assert item["type"] == "TASK_STATUS_CHANGED"
        assert item["fromStatus"] == "TODO"
        assert item["toStatus"] == "IN_PROGRESS"
        assert item["user"]["name"] == admin_user.full_name
        assert item["user"]["avatar"] is None
        assert item["taskTitle"] == "Task 1"
        assert item["projectId"] == str(sample_activity.project_id)


@pytest.mark.asyncio
async def test_get_activities_filter_by_project(
    async_client: AsyncClient,
    admin_user: User,
    sample_project: Project,
    sample_activity: Activity,
):
    """Admin or project member can filter activities by projectId."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.activity_repository.ActivityRepository.get_by_project_id", new_callable=AsyncMock) as mock_get_by_project:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = sample_project
        mock_get_by_project.return_value = [sample_activity]

        response = await async_client.get(
            f"/taskboard/api/v1/activities?projectId={sample_project.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert len(body["data"]) == 1
        assert body["data"][0]["projectId"] == str(sample_project.id)


@pytest.mark.asyncio
async def test_get_activities_member_scoped(
    async_client: AsyncClient,
    member_user: User,
    sample_project: Project,
    sample_activity: Activity,
):
    """Member receives activities scoped to projects they belong to."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_all", new_callable=AsyncMock) as mock_get_projects, \
         patch("app.dao.activity_repository.ActivityRepository.get_for_member", new_callable=AsyncMock) as mock_get_for_member:

        mock_get_user.return_value = member_user
        mock_get_projects.return_value = [sample_project]
        mock_get_for_member.return_value = [sample_activity]

        response = await async_client.get(
            "/taskboard/api/v1/activities",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert len(body["data"]) == 1


@pytest.mark.asyncio
async def test_get_activities_member_forbidden(
    async_client: AsyncClient,
    non_member_user: User,
    sample_project: Project,
):
    """Member cannot view activities of a project they are not assigned to."""
    token = token_service.create_access_token(
        str(non_member_user.id), non_member_user.email, non_member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = non_member_user
        mock_get_project.return_value = sample_project

        response = await async_client.get(
            f"/taskboard/api/v1/activities?projectId={sample_project.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        body = response.json()
        assert body["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


@pytest.mark.asyncio
async def test_get_activities_project_not_found(
    async_client: AsyncClient,
    admin_user: User,
):
    """Filtering by non-existent project returns 404."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    random_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = admin_user
        mock_get_project.return_value = None

        response = await async_client.get(
            f"/taskboard/api/v1/activities?projectId={random_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        body = response.json()
        assert body["error"]["code"] == "PROJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_activities_unauthorized(async_client: AsyncClient):
    """Request without authorization token is rejected with 401."""
    response = await async_client.get("/taskboard/api/v1/activities")
    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "MISSING_AUTH_TOKEN"


@pytest.mark.asyncio
async def test_task_lifecycle_activity_emission(
    admin_user: User,
    sample_project: Project,
):
    """Task operations trigger appropriate activity logs."""
    from app.schemas.task import CreateTaskRequest, UpdateTaskRequest
    from app.services.task_service import TaskService
    from app.models.task import Task

    mock_db = AsyncMock()
    service = TaskService(mock_db)

    # 1. Test Task Creation emits TASK_CREATED
    with patch.object(service.project_repo, "get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch.object(service.task_repo, "create", new_callable=AsyncMock) as mock_create_task, \
         patch.object(service.activity_service, "log_activity", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_sync_project_progress", new_callable=AsyncMock), \
         patch.object(service, "invalidate_dashboard_analytics_cache", new_callable=AsyncMock):

        mock_get_project.return_value = sample_project
        created_task = Task(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            title="Implement Auth",
            description="Add JWT auth",
            status="TODO",
            priority="HIGH",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        mock_create_task.return_value = created_task

        req = CreateTaskRequest(
            project_id=sample_project.id,
            title="Implement Auth",
            description="Add JWT auth",
            status="TODO",
            priority="HIGH",
        )
        await service.create_task(req, current_user=admin_user)

        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs["type"] == "TASK_CREATED"
        assert call_kwargs["task_title"] == "Implement Auth"
        assert call_kwargs["project_id"] == sample_project.id

    # 2. Test Task Status Transition emits TASK_STATUS_CHANGED
    with patch.object(service.task_repo, "get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch.object(service.project_repo, "get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch.object(service.task_repo, "update", new_callable=AsyncMock) as mock_update_task, \
         patch.object(service.activity_service, "log_activity", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_sync_project_progress", new_callable=AsyncMock), \
         patch.object(service, "invalidate_dashboard_analytics_cache", new_callable=AsyncMock):

        existing_task = Task(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            title="Implement Auth",
            status="TODO",
            priority="HIGH",
        )
        mock_get_task.return_value = existing_task
        mock_get_proj.return_value = sample_project

        updated = Task(
            id=existing_task.id,
            project_id=sample_project.id,
            title="Implement Auth",
            status="IN_PROGRESS",
            priority="HIGH",
        )
        mock_update_task.return_value = updated

        update_req = UpdateTaskRequest(status="IN_PROGRESS")
        await service.update_task(existing_task.id, update_req, current_user=admin_user)

        mock_log.assert_called_once()
        call_kwargs = mock_log.call_args.kwargs
        assert call_kwargs["type"] == "TASK_STATUS_CHANGED"
        assert call_kwargs["from_status"] == "TODO"
        assert call_kwargs["to_status"] == "IN_PROGRESS"

    # 3. Test Task Complete emits TASK_COMPLETED
    with patch.object(service.task_repo, "get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch.object(service.project_repo, "get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch.object(service.task_repo, "update", new_callable=AsyncMock) as mock_update_task, \
         patch.object(service.activity_service, "log_activity", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_sync_project_progress", new_callable=AsyncMock), \
         patch.object(service, "invalidate_dashboard_analytics_cache", new_callable=AsyncMock):

        existing_task = Task(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            title="Implement Auth",
            status="IN_PROGRESS",
            priority="HIGH",
        )
        mock_get_task.return_value = existing_task
        mock_get_proj.return_value = sample_project

        updated = Task(
            id=existing_task.id,
            project_id=sample_project.id,
            title="Implement Auth",
            status="DONE",
            priority="HIGH",
        )
        mock_update_task.return_value = updated

        update_req = UpdateTaskRequest(status="DONE")
        await service.update_task(existing_task.id, update_req, current_user=admin_user)

        mock_log.assert_called_once()
        assert mock_log.call_args.kwargs["type"] == "TASK_COMPLETED"

    # 4. Test Task Deletion emits TASK_DELETED
    with patch.object(service.task_repo, "get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch.object(service.task_repo, "delete", new_callable=AsyncMock) as mock_delete, \
         patch.object(service.activity_service, "log_activity", new_callable=AsyncMock) as mock_log, \
         patch.object(service, "_sync_project_progress", new_callable=AsyncMock), \
         patch.object(service, "invalidate_dashboard_analytics_cache", new_callable=AsyncMock):

        mock_get_task.return_value = existing_task
        mock_delete.return_value = True

        await service.delete_task(existing_task.id, current_user=admin_user)

        mock_log.assert_called_once()
        assert mock_log.call_args.kwargs["type"] == "TASK_DELETED"
        assert mock_log.call_args.kwargs["task_title"] == existing_task.title
