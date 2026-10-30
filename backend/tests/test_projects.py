"""Comprehensive Test Suite for Project Management and Assignment APIs.

Covers:
- POST /taskboard/api/v1/projects (201, 401, 403, 409, 422)
- GET /taskboard/api/v1/projects (200, 401)
- GET /taskboard/api/v1/projects/{project_id} (200, 403, 404)
- PATCH /taskboard/api/v1/projects/{project_id} (200, 403, 404)
- DELETE /taskboard/api/v1/projects/{project_id} (204, 403, 404)
- POST /taskboard/api/v1/users/{user_id}/assign-projects (200, 401, 403, 404, 422)
- DELETE /taskboard/api/v1/users/{user_id}/assign-projects (200, 401, 404)
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.project import Project
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
        full_name="Regular Member",
        email="member@taskboard.com",
        password_hash="member_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_project(admin_user: User) -> Project:
    return Project(
        id=uuid.uuid4(),
        name="Task Board API",
        description="Backend development project",
        status="ACTIVE",
        created_by=admin_user.id,
        start_date="2026-10-22",
        end_date="2026-12-31",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        members=[],
    )


# ==============================================================================
# 1. POST /taskboard/api/v1/projects Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_create_project_success(async_client: AsyncClient, admin_user: User, sample_project: Project):
    """Admin can create a project successfully (201 Created)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_name", new_callable=AsyncMock) as mock_get_name, \
         patch("app.dao.project_repository.ProjectRepository.create", new_callable=AsyncMock) as mock_create, \
         patch("app.dao.project_repository.ProjectRepository.assign_projects_to_user", new_callable=AsyncMock), \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_name.return_value = None
        mock_create.return_value = sample_project
        mock_get_proj.return_value = sample_project

        payload = {
            "name": "Task Board API",
            "description": "Backend development project",
            "start_date": "2026-10-22",
            "end_date": "2026-12-31",
        }

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Project created successfully."
        assert data["data"]["name"] == "Task Board API"


@pytest.mark.asyncio
async def test_create_project_with_wizard_fields(async_client: AsyncClient, admin_user: User):
    """Admin can create a project with all frontend wizard fields (key, tags, progress, status, ownerId, members)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    member_id = uuid.uuid4()
    payload = {
        "name": "Wizard Project",
        "description": "Full wizard test",
        "key": "WIZ",
        "status": "PLANNING",
        "progress": 25,
        "tags": ["FRONTEND", "BACKEND"],
        "ownerId": str(admin_user.id),
        "members": [str(member_id)],
        "startDate": "2026-11-01",
        "dueDate": "2026-12-01",
    }

    created_project = Project(
        id=uuid.uuid4(),
        name=payload["name"],
        key=payload["key"],
        description=payload["description"],
        status=payload["status"],
        progress=payload["progress"],
        tags=payload["tags"],
        columns=[],
        start_date=payload["startDate"],
        end_date=payload["dueDate"],
        created_by=admin_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        members=[],
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_name", new_callable=AsyncMock) as mock_get_name, \
         patch("app.dao.project_repository.ProjectRepository.create", new_callable=AsyncMock) as mock_create, \
         patch("app.dao.project_repository.ProjectRepository.assign_projects_to_user", new_callable=AsyncMock) as mock_assign, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_name.return_value = None
        mock_create.return_value = created_project
        mock_assign.return_value = 1
        mock_get_proj.return_value = created_project

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Wizard Project"
        assert data["data"]["key"] == "WIZ"
        assert data["data"]["status"] == "PLANNING"
        assert data["data"]["progress"] == 25
        assert data["data"]["tags"] == ["FRONTEND", "BACKEND"]
        assert data["data"]["start_date"] == "2026-11-01"
        assert data["data"]["end_date"] == "2026-12-01"
        assert data["data"]["created_by"] == str(admin_user.id)
        assert data["data"]["owner_id"] == str(admin_user.id)
        assert "ownerId" not in data["data"]
        assert "startDate" not in data["data"]
        assert "dueDate" not in data["data"]



@pytest.mark.asyncio
async def test_create_project_forbidden_for_member(async_client: AsyncClient, member_user: User):
    """Standard member cannot create projects (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {member_token}"},
            json={"name": "Member Project"},
        )

        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_create_project_conflict(async_client: AsyncClient, admin_user: User, sample_project: Project):
    """Attempting to create a project with an existing name raises 409 Conflict."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_name", new_callable=AsyncMock) as mock_get_name:

        mock_get_user.return_value = admin_user
        mock_get_name.return_value = sample_project

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Task Board API"},
        )

        assert response.status_code == 409
        assert "A project with the provided name already exists." in response.text


@pytest.mark.asyncio
async def test_create_project_validation_error(async_client: AsyncClient, admin_user: User):
    """Missing project name raises 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"description": "No name provided"},
        )

        assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_project_invalid_status_rejected(async_client: AsyncClient, admin_user: User):
    """Providing an invalid project status raises 422 Unprocessable Entity."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = admin_user

        response = await async_client.post(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Invalid Status Project",
                "status": "NONEXISTENT_STATUS",
            },
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Validation Error"



# ==============================================================================
# 2. GET /taskboard/api/v1/projects Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_get_all_projects_success(async_client: AsyncClient, member_user: User, sample_project: Project):
    """Authenticated user retrieves accessible projects (200 OK)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_all", new_callable=AsyncMock) as mock_get_all:

        mock_get_user.return_value = member_user
        mock_get_all.return_value = [sample_project]

        response = await async_client.get(
            "/taskboard/api/v1/projects",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["name"] == "Task Board API"


# ==============================================================================
# 3. GET /taskboard/api/v1/projects/{project_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_get_project_by_id_admin_access(async_client: AsyncClient, admin_user: User, sample_project: Project):
    """Admin can view any project by ID (200 OK)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = sample_project

        response = await async_client.get(
            f"/taskboard/api/v1/projects/{sample_project.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == str(sample_project.id)


@pytest.mark.asyncio
async def test_get_project_by_id_member_forbidden(async_client: AsyncClient, member_user: User, sample_project: Project):
    """Unassigned member cannot view project details (403 Forbidden)."""
    member_token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = member_user
        mock_get_proj.return_value = sample_project

        response = await async_client.get(
            f"/taskboard/api/v1/projects/{sample_project.id}",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 403
        assert "You do not have access to the requested project." in response.text


@pytest.mark.asyncio
async def test_get_project_by_id_not_found(async_client: AsyncClient, admin_user: User):
    """Non-existent project returns 404 Not Found."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    non_existent_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = None

        response = await async_client.get(
            f"/taskboard/api/v1/projects/{non_existent_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404
        assert "The requested project could not be found." in response.text


# ==============================================================================
# 4. PATCH /taskboard/api/v1/projects/{project_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_update_project_success(async_client: AsyncClient, admin_user: User, sample_project: Project):
    """Admin can update project details (200 OK)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    updated_project = Project(
        id=sample_project.id,
        name="Task Board API v2",
        description="Updated description",
        status="COMPLETED",
        created_by=admin_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        members=[],
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.project_repository.ProjectRepository.get_by_name", new_callable=AsyncMock) as mock_get_name, \
         patch("app.dao.project_repository.ProjectRepository.update", new_callable=AsyncMock) as mock_update:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = sample_project
        mock_get_name.return_value = None
        mock_update.return_value = updated_project

        response = await async_client.patch(
            f"/taskboard/api/v1/projects/{sample_project.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Task Board API v2", "status": "COMPLETED"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Task Board API v2"
        assert data["data"]["status"] == "COMPLETED"


# ==============================================================================
# 5. DELETE /taskboard/api/v1/projects/{project_id} Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_delete_project_success(async_client: AsyncClient, admin_user: User, sample_project: Project):
    """Admin can delete a project (204 No Content)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.project_repository.ProjectRepository.delete", new_callable=AsyncMock) as mock_delete:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = sample_project
        mock_delete.return_value = True

        response = await async_client.delete(
            f"/taskboard/api/v1/projects/{sample_project.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 204
        assert mock_delete.called


@pytest.mark.asyncio
async def test_delete_project_not_found(async_client: AsyncClient, admin_user: User):
    """Admin attempting to delete non-existent project receives 404 Not Found."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )
    non_existent_id = uuid.uuid4()

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj:

        mock_get_user.return_value = admin_user
        mock_get_proj.return_value = None

        response = await async_client.delete(
            f"/taskboard/api/v1/projects/{non_existent_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404
        assert "The requested project could not be found." in response.text



# ==============================================================================
# 6. Project Assignment Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_assign_projects_success(async_client: AsyncClient, admin_user: User, member_user: User, sample_project: Project):
    """Admin can assign projects to a user (200 OK)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.project_repository.ProjectRepository.is_user_assigned_to_project", new_callable=AsyncMock) as mock_is_assigned, \
         patch("app.dao.project_repository.ProjectRepository.assign_projects_to_user", new_callable=AsyncMock) as mock_assign:

        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            elif str(uid) == str(member_user.id):
                return member_user
            return None

        mock_get_user.side_effect = side_effect
        mock_get_proj.return_value = sample_project
        mock_is_assigned.return_value = False
        mock_assign.return_value = 1

        response = await async_client.post(
            f"/taskboard/api/v1/users/{member_user.id}/assign-projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"project_ids": [str(sample_project.id)]},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["assigned_projects"] == 1


@pytest.mark.asyncio
async def test_assign_projects_already_assigned(async_client: AsyncClient, admin_user: User, member_user: User, sample_project: Project):
    """Assigning a user who is already a member of the project returns 409 Conflict with USER_ALREADY_ASSIGNED code."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.project_repository.ProjectRepository.is_user_assigned_to_project", new_callable=AsyncMock) as mock_is_assigned:

        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            elif str(uid) == str(member_user.id):
                return member_user
            return None

        mock_get_user.side_effect = side_effect
        mock_get_proj.return_value = sample_project
        mock_is_assigned.return_value = True

        response = await async_client.post(
            f"/taskboard/api/v1/users/{member_user.id}/assign-projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"project_ids": [str(sample_project.id)]},
        )

        assert response.status_code == 409
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "USER_ALREADY_ASSIGNED"
        assert data["code"] == "USER_ALREADY_ASSIGNED"
        assert "User is already assigned to this project." in data["message"]


@pytest.mark.asyncio
async def test_remove_project_assignment_success(async_client: AsyncClient, admin_user: User, member_user: User, sample_project: Project):
    """Admin can remove project membership from a user (200 OK)."""
    admin_token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id") as mock_get_user, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_proj, \
         patch("app.dao.project_repository.ProjectRepository.remove_project_from_user", new_callable=AsyncMock) as mock_remove:

        async def side_effect(uid):
            if str(uid) == str(admin_user.id):
                return admin_user
            elif str(uid) == str(member_user.id):
                return member_user
            return None

        mock_get_user.side_effect = side_effect
        mock_get_proj.return_value = sample_project
        mock_remove.return_value = True

        response = await async_client.request(
            "DELETE",
            f"/taskboard/api/v1/users/{member_user.id}/assign-projects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"project_id": str(sample_project.id)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Project assignment removed successfully."


# ==============================================================================
# 5. Project Progress Dynamic Calculation Tests
# ==============================================================================
def test_calculate_project_progress_completed_status():
    """Completed status always yields 100% progress."""
    from app.services.project_service import ProjectService
    progress = ProjectService.calculate_project_progress(status="COMPLETED")
    assert progress == 100


def test_calculate_project_progress_planning_status():
    """Planning status without tasks always yields 0% progress."""
    from app.services.project_service import ProjectService
    progress = ProjectService.calculate_project_progress(
        status="PLANNING",
        start_date="2026-10-01",
        end_date="2026-11-01",
        tasks=[],
    )
    assert progress == 0


def test_calculate_project_progress_timeline_future():
    """Active project starting in the future yields 0%."""
    from app.services.project_service import ProjectService
    progress = ProjectService.calculate_project_progress(
        status="ACTIVE",
        start_date="2099-01-01",
        end_date="2099-02-01",
    )
    assert progress == 0


def test_calculate_project_progress_timeline_past():
    """Active project with end date in the past yields 100%."""
    from app.services.project_service import ProjectService
    progress = ProjectService.calculate_project_progress(
        status="ACTIVE",
        start_date="2020-01-01",
        end_date="2020-02-01",
    )
    assert progress == 100


def test_calculate_project_progress_timeline_midway():
    """Active project with timeline spanning around today calculates elapsed percentage."""
    from datetime import date, timedelta
    from app.services.project_service import ProjectService
    today = date.today()
    start = today - timedelta(days=5)
    end = today + timedelta(days=5)
    # Total days = 10, elapsed days = 5 -> 50%
    progress = ProjectService.calculate_project_progress(
        status="ACTIVE",
        start_date=start,
        end_date=end,
    )
    assert progress == 50


def test_calculate_project_progress_with_tasks():
    """When tasks are present, task completion ratio overrides timeline."""
    from unittest.mock import MagicMock
    from app.services.project_service import ProjectService
    
    t1 = MagicMock(status="DONE")
    t2 = MagicMock(status="IN_PROGRESS")
    t3 = MagicMock(status="TODO")
    t4 = MagicMock(status="DONE")

    progress = ProjectService.calculate_project_progress(
        status="ACTIVE",
        start_date="2020-01-01",
        end_date="2020-02-01",
        tasks=[t1, t2, t3, t4],
    )
    # 2 out of 4 tasks are DONE -> 50%
    assert progress == 50

