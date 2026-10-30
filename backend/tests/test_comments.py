"""Test Suite for Task Comments API (Route 1: POST /taskboard/api/v1/tasks/{task_id}/comments).

Covers:
- Positive Response (201 Created with author info and formatted timestamp)
- 401 Unauthorized (missing or invalid auth token)
- 403 Forbidden (insufficient permissions for non-member user)
- 404 Not Found (task does not exist)
- 422 Unprocessable Entity (missing or empty content)
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import uuid
import pytest
from httpx import AsyncClient
from app.models.comment import Comment
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
def sample_task(sample_project: Project, member_user: User) -> Task:
    return Task(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        title="Build Comment API",
        description="Implement task discussion comment endpoints.",
        status="IN_PROGRESS",
        priority="HIGH",
        assignee_id=member_user.id,
        due_date="2026-11-20",
        tags=["comments", "collaboration"],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_comment(sample_task: Task, member_user: User) -> Comment:
    return Comment(
        id=uuid.uuid4(),
        task_id=sample_task.id,
        user_id=member_user.id,
        content="I have started working on the initial migration and endpoints.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        user=member_user,
    )


# ==============================================================================
# Route 1: POST /taskboard/api/v1/tasks/{task_id}/comments
# ==============================================================================

@pytest.mark.asyncio
async def test_create_comment_success(
    async_client: AsyncClient,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
    sample_comment: Comment,
):
    """Member can add a comment to a task in their project (201 Created)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.comment_repository.CommentRepository.create", new_callable=AsyncMock) as mock_create_comment:

        mock_get_user.return_value = member_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project
        mock_create_comment.return_value = sample_comment

        payload = {"content": "I have started working on the initial migration and endpoints."}

        response = await async_client.post(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )

        assert response.status_code == 201
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "Comment added successfully."
        comment_data = body["data"]
        assert comment_data["id"] == str(sample_comment.id)
        assert comment_data["content"] == payload["content"]
        assert "createdAt" in comment_data
        assert "updatedAt" in comment_data
        assert "task_id" not in comment_data
        assert "user_id" not in comment_data
        assert comment_data["author"]["id"] == str(member_user.id)
        assert comment_data["author"]["name"] == member_user.full_name
        assert comment_data["author"]["role"] == member_user.role.upper()
        assert "email" not in comment_data["author"]


@pytest.mark.asyncio
async def test_create_comment_unauthorized(
    async_client: AsyncClient,
    sample_task: Task,
):
    """Request without authorization token is rejected with 401 Unauthorized."""
    payload = {"content": "This should be rejected."}
    response = await async_client.post(
        f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
        json=payload,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_comment_task_not_found(
    async_client: AsyncClient,
    member_user: User,
):
    """Adding a comment to a non-existent task returns 404 Not Found."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task:

        mock_get_user.return_value = member_user
        mock_get_task.return_value = None

        fake_task_id = uuid.uuid4()
        response = await async_client.post(
            f"/taskboard/api/v1/tasks/{fake_task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Hello on missing task"},
        )

        assert response.status_code == 404
        body = response.json()
        assert "not be found" in body["message"].lower()


@pytest.mark.asyncio
async def test_create_comment_forbidden_non_member(
    async_client: AsyncClient,
    non_member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Non-member user is denied access with 403 Forbidden."""
    token = token_service.create_access_token(
        str(non_member_user.id), non_member_user.email, non_member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = non_member_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project

        response = await async_client.post(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Unauthorized comment attempt"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "permission" in body["message"].lower()


@pytest.mark.asyncio
async def test_create_comment_forbidden_non_assignee(
    async_client: AsyncClient,
    admin_user: User,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Project member who is NOT assigned to the task is forbidden from commenting (403)."""
    other_member = User(
        id=uuid.uuid4(),
        full_name="Other Colleague",
        email="colleague@taskboard.com",
        password_hash="colleague_hash",
        role="member",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    sample_project.members.append(other_member)

    token = token_service.create_access_token(
        str(other_member.id), other_member.email, other_member.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = other_member
        mock_get_task.return_value = sample_task  # sample_task is assigned to member_user, not other_member
        mock_get_project.return_value = sample_project

        response = await async_client.post(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Attempting to comment on someone else's assigned task"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "assigned to you" in body["message"].lower()


@pytest.mark.asyncio
async def test_create_comment_validation_empty_content(
    async_client: AsyncClient,
    member_user: User,
    sample_task: Task,
):
    """Empty or whitespace-only content is rejected with 422 Unprocessable Entity."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.post(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "    "},
        )

        assert response.status_code == 422


# ==============================================================================
# Route 2: GET /taskboard/api/v1/tasks/{task_id}/comments
# ==============================================================================

@pytest.mark.asyncio
async def test_get_task_comments_success(
    async_client: AsyncClient,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
    sample_comment: Comment,
):
    """Member can fetch all comments for a task (200 OK with simplified payload)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.comment_repository.CommentRepository.get_by_task_id", new_callable=AsyncMock) as mock_get_comments:

        mock_get_user.return_value = member_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project
        mock_get_comments.return_value = [sample_comment]

        response = await async_client.get(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "Comments retrieved successfully."
        assert len(body["data"]) == 1

        comment_data = body["data"][0]
        assert comment_data["id"] == str(sample_comment.id)
        assert comment_data["content"] == sample_comment.content
        assert "createdAt" in comment_data
        assert "updatedAt" in comment_data
        assert "task_id" not in comment_data
        assert "user_id" not in comment_data
        assert comment_data["author"]["id"] == str(member_user.id)
        assert comment_data["author"]["name"] == member_user.full_name
        assert comment_data["author"]["role"] == member_user.role.upper()
        assert "email" not in comment_data["author"]


@pytest.mark.asyncio
async def test_get_task_comments_empty(
    async_client: AsyncClient,
    member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Returns empty list when no comments exist on the task (200 OK)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project, \
         patch("app.dao.comment_repository.CommentRepository.get_by_task_id", new_callable=AsyncMock) as mock_get_comments:

        mock_get_user.return_value = member_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project
        mock_get_comments.return_value = []

        response = await async_client.get(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"] == []


@pytest.mark.asyncio
async def test_get_task_comments_unauthorized(
    async_client: AsyncClient,
    sample_task: Task,
):
    """Request without token returns 401 Unauthorized."""
    response = await async_client.get(
        f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_task_comments_task_not_found(
    async_client: AsyncClient,
    member_user: User,
):
    """Fetching comments for non-existent task returns 404 Not Found."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task:

        mock_get_user.return_value = member_user
        mock_get_task.return_value = None

        fake_task_id = uuid.uuid4()
        response = await async_client.get(
            f"/taskboard/api/v1/tasks/{fake_task_id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        body = response.json()
        assert "not be found" in body["message"].lower()


@pytest.mark.asyncio
async def test_get_task_comments_forbidden_non_member(
    async_client: AsyncClient,
    non_member_user: User,
    sample_project: Project,
    sample_task: Task,
):
    """Non-member user is denied with 403 Forbidden."""
    token = token_service.create_access_token(
        str(non_member_user.id), non_member_user.email, non_member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.task_repository.TaskRepository.get_by_id", new_callable=AsyncMock) as mock_get_task, \
         patch("app.dao.project_repository.ProjectRepository.get_by_id", new_callable=AsyncMock) as mock_get_project:

        mock_get_user.return_value = non_member_user
        mock_get_task.return_value = sample_task
        mock_get_project.return_value = sample_project

        response = await async_client.get(
            f"/taskboard/api/v1/tasks/{sample_task.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "permission" in body["message"].lower()


# ==============================================================================
# Route 3: PATCH /taskboard/api/v1/comments/{comment_id}
# ==============================================================================

@pytest.mark.asyncio
async def test_update_comment_success_by_author(
    async_client: AsyncClient,
    member_user: User,
    sample_comment: Comment,
):
    """Author can successfully edit their own comment (200 OK)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    updated_comment = Comment(
        id=sample_comment.id,
        task_id=sample_comment.task_id,
        user_id=member_user.id,
        content="Updated comment body with more details.",
        created_at=sample_comment.created_at,
        updated_at=datetime.now(timezone.utc),
        user=member_user,
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment, \
         patch("app.dao.comment_repository.CommentRepository.update", new_callable=AsyncMock) as mock_update_comment:

        mock_get_user.return_value = member_user
        mock_get_comment.return_value = sample_comment
        mock_update_comment.return_value = updated_comment

        payload = {"content": "Updated comment body with more details."}

        response = await async_client.patch(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "Comment updated successfully."
        comment_data = body["data"]
        assert comment_data["id"] == str(sample_comment.id)
        assert comment_data["content"] == payload["content"]
        assert "createdAt" in comment_data
        assert "updatedAt" in comment_data
        assert comment_data["author"]["id"] == str(member_user.id)
        assert comment_data["author"]["name"] == member_user.full_name


@pytest.mark.asyncio
async def test_update_comment_success_by_admin(
    async_client: AsyncClient,
    admin_user: User,
    member_user: User,
    sample_comment: Comment,
):
    """Admin can edit any user's comment (200 OK)."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    updated_comment = Comment(
        id=sample_comment.id,
        task_id=sample_comment.task_id,
        user_id=member_user.id,
        content="Admin moderated comment.",
        created_at=sample_comment.created_at,
        updated_at=datetime.now(timezone.utc),
        user=member_user,
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment, \
         patch("app.dao.comment_repository.CommentRepository.update", new_callable=AsyncMock) as mock_update_comment:

        mock_get_user.return_value = admin_user
        mock_get_comment.return_value = sample_comment
        mock_update_comment.return_value = updated_comment

        payload = {"content": "Admin moderated comment."}

        response = await async_client.patch(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["data"]["content"] == payload["content"]


@pytest.mark.asyncio
async def test_update_comment_forbidden_other_member(
    async_client: AsyncClient,
    non_member_user: User,
    member_user: User,
    sample_comment: Comment,
):
    """Another standard user cannot edit someone else's comment (403 Forbidden)."""
    token = token_service.create_access_token(
        str(non_member_user.id), non_member_user.email, non_member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment:

        mock_get_user.return_value = non_member_user
        mock_get_comment.return_value = sample_comment

        response = await async_client.patch(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Malicious edit attempt"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "only edit your own" in body["message"].lower()


@pytest.mark.asyncio
async def test_update_comment_not_found(
    async_client: AsyncClient,
    member_user: User,
):
    """Updating non-existent comment returns 404 Not Found."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment:

        mock_get_user.return_value = member_user
        mock_get_comment.return_value = None

        fake_comment_id = uuid.uuid4()
        response = await async_client.patch(
            f"/taskboard/api/v1/comments/{fake_comment_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "Edit missing comment"},
        )

        assert response.status_code == 404
        body = response.json()
        assert "not found" in body["message"].lower()


@pytest.mark.asyncio
async def test_update_comment_validation_empty(
    async_client: AsyncClient,
    member_user: User,
    sample_comment: Comment,
):
    """Empty content in update request is rejected with 422 Unprocessable Content."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = member_user

        response = await async_client.patch(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "     "},
        )

        assert response.status_code == 422


# ==============================================================================
# Route 4: DELETE /taskboard/api/v1/comments/{comment_id}
# ==============================================================================

@pytest.mark.asyncio
async def test_delete_comment_success_by_author(
    async_client: AsyncClient,
    member_user: User,
    sample_comment: Comment,
):
    """Author can successfully delete their own comment (204 No Content)."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment, \
         patch("app.dao.comment_repository.CommentRepository.delete", new_callable=AsyncMock) as mock_delete:

        mock_get_user.return_value = member_user
        mock_get_comment.return_value = sample_comment
        mock_delete.return_value = True

        response = await async_client.delete(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204
        assert response.content == b""


@pytest.mark.asyncio
async def test_delete_comment_success_by_admin(
    async_client: AsyncClient,
    admin_user: User,
    sample_comment: Comment,
):
    """Admin can delete any user's comment (204 No Content)."""
    token = token_service.create_access_token(
        str(admin_user.id), admin_user.email, admin_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment, \
         patch("app.dao.comment_repository.CommentRepository.delete", new_callable=AsyncMock) as mock_delete:

        mock_get_user.return_value = admin_user
        mock_get_comment.return_value = sample_comment
        mock_delete.return_value = True

        response = await async_client.delete(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_comment_unauthorized(
    async_client: AsyncClient,
    sample_comment: Comment,
):
    """Deleting without authorization token returns 401 Unauthorized."""
    response = await async_client.delete(
        f"/taskboard/api/v1/comments/{sample_comment.id}",
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_comment_forbidden_other_member(
    async_client: AsyncClient,
    non_member_user: User,
    member_user: User,
    sample_comment: Comment,
):
    """Another standard user cannot delete someone else's comment (403 Forbidden)."""
    token = token_service.create_access_token(
        str(non_member_user.id), non_member_user.email, non_member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment:

        mock_get_user.return_value = non_member_user
        mock_get_comment.return_value = sample_comment

        response = await async_client.delete(
            f"/taskboard/api/v1/comments/{sample_comment.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "only delete your own" in body["message"].lower()


@pytest.mark.asyncio
async def test_delete_comment_not_found(
    async_client: AsyncClient,
    member_user: User,
):
    """Deleting a non-existent comment returns 404 Not Found."""
    token = token_service.create_access_token(
        str(member_user.id), member_user.email, member_user.role
    )

    with patch("app.dao.user_repository.UserRepository.get_by_id", new_callable=AsyncMock) as mock_get_user, \
         patch("app.dao.comment_repository.CommentRepository.get_by_id", new_callable=AsyncMock) as mock_get_comment:

        mock_get_user.return_value = member_user
        mock_get_comment.return_value = None

        fake_comment_id = uuid.uuid4()
        response = await async_client.delete(
            f"/taskboard/api/v1/comments/{fake_comment_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        body = response.json()
        assert "not found" in body["message"].lower()



