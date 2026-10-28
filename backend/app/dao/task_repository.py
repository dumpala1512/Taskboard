"""Task Data Access Object (DAO) / Repository."""

from datetime import datetime, timezone
from typing import List, Optional, Tuple, Union
import uuid
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.project import Project, project_members
from app.models.task import Task


class TaskRepository:
    """Repository handling database operations for the Task model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, task: Task) -> Task:
        """Persist a new task entity to the database."""
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def get_by_id(self, task_id: Union[uuid.UUID, str]) -> Optional[Task]:
        """Fetch a single task by primary key UUID."""
        if isinstance(task_id, str):
            try:
                task_id = uuid.UUID(task_id)
            except ValueError:
                return None
        query = select(Task).options(selectinload(Task.assignee), selectinload(Task.project)).where(Task.id == task_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_project(self, project_id: Union[uuid.UUID, str]) -> List[Task]:
        """Retrieve all tasks belonging to a specific project."""
        if isinstance(project_id, str):
            try:
                project_id = uuid.UUID(project_id)
            except ValueError:
                return []
        query = (
            select(Task)
            .options(selectinload(Task.assignee))
            .where(Task.project_id == project_id)
            .order_by(Task.created_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_all(
        self,
        user_id: Optional[Union[uuid.UUID, str]] = None,
        is_admin: bool = False,
    ) -> List[Task]:
        """Retrieve all tasks accessible to the caller.

        Admins view all tasks; regular members view tasks for projects they own or are assigned to.
        """
        if is_admin or user_id is None:
            query = (
                select(Task)
                .options(selectinload(Task.assignee), selectinload(Task.project))
                .order_by(Task.created_at.desc())
            )
        else:
            if isinstance(user_id, str):
                try:
                    user_id = uuid.UUID(user_id)
                except ValueError:
                    return []

            project_accessible_subquery = (
                select(Project.id)
                .where(
                    (Project.created_by == user_id)
                    | (
                        select(1)
                        .select_from(project_members)
                        .where(
                            (project_members.c.project_id == Project.id)
                            & (project_members.c.user_id == user_id)
                        )
                        .exists()
                    )
                )
            )

            query = (
                select(Task)
                .options(selectinload(Task.assignee), selectinload(Task.project))
                .where(Task.project_id.in_(project_accessible_subquery))
                .order_by(Task.created_at.desc())
            )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_tasks(
        self,
        user_id: Optional[Union[uuid.UUID, str]] = None,
        is_admin: bool = False,
        project_id: Optional[Union[uuid.UUID, str]] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[Union[uuid.UUID, str]] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Task], int]:
        """Retrieve tasks with optional filters (project_id, status, priority, assignee_id) and pagination.

        Returns:
            Tuple of (tasks_list, total_count)
        """
        conditions = []

        if project_id is not None:
            if isinstance(project_id, str):
                try:
                    project_id = uuid.UUID(project_id)
                except ValueError:
                    return [], 0
            conditions.append(Task.project_id == project_id)
        elif not is_admin and user_id is not None:
            if isinstance(user_id, str):
                try:
                    user_id = uuid.UUID(user_id)
                except ValueError:
                    return [], 0

            project_accessible_subquery = (
                select(Project.id)
                .where(
                    (Project.created_by == user_id)
                    | (
                        select(1)
                        .select_from(project_members)
                        .where(
                            (project_members.c.project_id == Project.id)
                            & (project_members.c.user_id == user_id)
                        )
                        .exists()
                    )
                )
            )
            conditions.append(Task.project_id.in_(project_accessible_subquery))

        if status:
            conditions.append(func.lower(Task.status) == status.strip().lower())

        if priority:
            conditions.append(func.lower(Task.priority) == priority.strip().lower())

        if assignee_id is not None:
            if isinstance(assignee_id, str):
                try:
                    assignee_id = uuid.UUID(assignee_id)
                except ValueError:
                    return [], 0
            conditions.append(Task.assignee_id == assignee_id)

        # 1. Total matching count
        count_stmt = select(func.count(Task.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # 2. Paginated rows
        query = (
            select(Task)
            .options(selectinload(Task.assignee), selectinload(Task.project))
            .order_by(Task.created_at.desc())
        )
        if conditions:
            query = query.where(*conditions)

        if page_size > 0:
            offset = max(0, (page - 1) * page_size)
            query = query.offset(offset).limit(page_size)

        result = await self.session.execute(query)
        tasks = list(result.scalars().all())
        return tasks, total

    async def update(self, task_id: Union[uuid.UUID, str], updates: dict) -> Optional[Task]:
        """Update a task's attributes in the database."""
        if isinstance(task_id, str):
            try:
                task_id = uuid.UUID(task_id)
            except ValueError:
                return None
        task = await self.get_by_id(task_id)
        if not task:
            return None
        non_nullable_attrs = {"id", "project_id", "title", "status", "priority"}
        for key, value in updates.items():
            if key in non_nullable_attrs and (value is None or (isinstance(value, str) and not value.strip())):
                continue
            if hasattr(task, key):
                setattr(task, key, value)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def delete(self, task_id: Union[uuid.UUID, str]) -> bool:
        """Delete a task by ID."""
        if isinstance(task_id, str):
            try:
                task_id = uuid.UUID(task_id)
            except ValueError:
                return False
        stmt = delete(Task).where(Task.id == task_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return (result.rowcount or 0) > 0
