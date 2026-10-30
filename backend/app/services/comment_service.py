"""Comment Service handling discussion logic and task access verification."""

import logging
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.comment_repository import CommentRepository
from app.dao.project_repository import ProjectRepository
from app.dao.task_repository import TaskRepository
from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.schemas.comment import CommentAuthor, CommentData, CreateCommentRequest, UpdateCommentRequest

logger = logging.getLogger(__name__)


class CommentService:
    """Service handling task discussion and comment operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.comment_repo = CommentRepository(db)
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)

    async def _verify_task_access(self, task_id: uuid.UUID, current_user: User) -> Task:
        """Verify task exists and current user has permission to view/interact with it."""
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "The specified task could not be found.",
                    "error": {"code": "RESOURCE_NOT_FOUND"},
                    "code": "RESOURCE_NOT_FOUND",
                },
            )

        if current_user.role.lower() != "admin":
            project = await self.project_repo.get_by_id(task.project_id)
            if project:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have permission to access tasks comments in this project.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )

        return task

    @staticmethod
    def _format_comment_data(comment: Comment, fallback_user: Optional[User] = None) -> CommentData:
        """Format an ORM Comment instance into CommentData schema."""
        author_user = comment.user or fallback_user
        author = None
        if author_user:
            author = CommentAuthor(
                id=author_user.id,
                name=author_user.full_name,
                role=author_user.role.upper(),
            )

        return CommentData(
            id=comment.id,
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            author=author,
        )

    async def create_comment(
        self,
        task_id: uuid.UUID,
        data: CreateCommentRequest,
        current_user: User,
    ) -> CommentData:
        """Add a new comment to a task (Route 1)."""
        task = await self._verify_task_access(task_id, current_user)

        # Non-admin users can only comment if the task is assigned to them
        if current_user.role.lower() != "admin":
            is_assignee = task.assignee_id is not None and str(task.assignee_id) == str(current_user.id)
            if not is_assignee:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "message": "You can only comment on tasks assigned to you.",
                        "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                        "code": "INSUFFICIENT_PERMISSIONS",
                    },
                )

        comment = Comment(
            task_id=task.id,
            user_id=current_user.id,
            content=data.content,
        )
        saved_comment = await self.comment_repo.create(comment)
        logger.info(
            "User %s added comment %s on task %s",
            current_user.email,
            saved_comment.id,
            task.id,
        )
        return self._format_comment_data(saved_comment, fallback_user=current_user)

    async def get_task_comments(
        self,
        task_id: uuid.UUID,
        current_user: User,
    ) -> List[CommentData]:
        """Retrieve all comments on a task."""
        await self._verify_task_access(task_id, current_user)
        comments = await self.comment_repo.get_by_task_id(task_id)
        return [self._format_comment_data(c) for c in comments]

    async def update_comment(
        self,
        comment_id: uuid.UUID,
        data: UpdateCommentRequest,
        current_user: User,
    ) -> CommentData:
        """Update an existing comment. Restricted to the original author or an admin."""
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Comment not found.",
                    "error": {"code": "COMMENT_NOT_FOUND"},
                    "code": "COMMENT_NOT_FOUND",
                },
            )

        is_author = str(comment.user_id) == str(current_user.id)
        is_admin = current_user.role.lower() == "admin"
        if not is_author and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "You can only edit your own comments.",
                    "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                    "code": "INSUFFICIENT_PERMISSIONS",
                },
            )

        updated = await self.comment_repo.update(comment_id, data.content)
        return self._format_comment_data(updated or comment, fallback_user=current_user)

    async def delete_comment(
        self,
        comment_id: uuid.UUID,
        current_user: User,
    ) -> bool:
        """Delete a comment. Restricted to the author or an administrator."""
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Comment not found.",
                    "error": {"code": "COMMENT_NOT_FOUND"},
                    "code": "COMMENT_NOT_FOUND",
                },
            )

        is_author = str(comment.user_id) == str(current_user.id)
        is_admin = current_user.role.lower() == "admin"
        if not is_author and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "You can only delete your own comments.",
                    "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                    "code": "INSUFFICIENT_PERMISSIONS",
                },
            )

        return await self.comment_repo.delete(comment_id)

