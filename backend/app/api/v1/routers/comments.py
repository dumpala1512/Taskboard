"""Comments Router for task discussions."""

import uuid
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.comment import (
    CommentResponseEnvelope,
    CommentsListResponseEnvelope,
    CreateCommentRequest,
    UpdateCommentRequest,
)
from app.services.comment_service import CommentService

comments_router = APIRouter(tags=["Comments"])


# ==============================================================================
# Route 1: Create Comment on a Task
# POST /taskboard/api/v1/tasks/{task_id}/comments
# ==============================================================================
@comments_router.post(
    "/tasks/{task_id}/comments",
    response_model=CommentResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    summary="Create Comment",
    description="Adds a new discussion comment to a task.",
)
async def create_comment(
    task_id: uuid.UUID,
    payload: CreateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentResponseEnvelope:
    """Create a new comment on a task."""
    service = CommentService(db)
    comment_data = await service.create_comment(
        task_id=task_id,
        data=payload,
        current_user=current_user,
    )
    return CommentResponseEnvelope(
        success=True,
        message="Comment added successfully.",
        data=comment_data,
    )


# ==============================================================================
# Route 2: Get Comments for a Task
# GET /taskboard/api/v1/tasks/{task_id}/comments
# ==============================================================================
@comments_router.get(
    "/tasks/{task_id}/comments",
    response_model=CommentsListResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="List Task Comments",
    description="Retrieves all discussion comments on a task ordered chronologically.",
)
async def get_task_comments(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentsListResponseEnvelope:
    """Retrieve all comments on a task."""
    service = CommentService(db)
    comments_data = await service.get_task_comments(
        task_id=task_id,
        current_user=current_user,
    )
    return CommentsListResponseEnvelope(
        success=True,
        message="Comments retrieved successfully.",
        data=comments_data,
    )


# ==============================================================================
# Route 3: Update Comment
# PATCH /taskboard/api/v1/comments/{comment_id}
# ==============================================================================
@comments_router.patch(
    "/comments/{comment_id}",
    response_model=CommentResponseEnvelope,
    status_code=status.HTTP_200_OK,
    summary="Update Comment",
    description="Updates the content of an existing comment. Restricted to the author or an administrator.",
)
async def update_comment(
    comment_id: uuid.UUID,
    payload: UpdateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentResponseEnvelope:
    """Update an existing comment."""
    service = CommentService(db)
    comment_data = await service.update_comment(
        comment_id=comment_id,
        data=payload,
        current_user=current_user,
    )
    return CommentResponseEnvelope(
        success=True,
        message="Comment updated successfully.",
        data=comment_data,
    )


# ==============================================================================
# Route 4: Delete Comment
# DELETE /taskboard/api/v1/comments/{comment_id}
# ==============================================================================
@comments_router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Comment",
    description="Deletes a comment. Restricted to the author or an administrator.",
)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a comment."""
    service = CommentService(db)
    await service.delete_comment(comment_id=comment_id, current_user=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

