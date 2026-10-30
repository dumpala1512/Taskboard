"""Task SQLAlchemy 2.0 ORM Model."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.project import Project
    from app.models.user import User


class Task(Base):
    """Task entity model representing a work item within a project."""

    __tablename__ = "tasks"

    # UUID Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    # Foreign Key: Project
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core Task Fields
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="TODO",
        nullable=False,
        index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(50),
        default="MEDIUM",
        nullable=False,
        index=True,
    )

    # Foreign Key: Assignee (User)
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Dates & Metadata
    due_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    start_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    tags: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    estimated_time: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    task_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    points: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="tasks",
        lazy="selectin",
    )
    assignee: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[assignee_id],
        lazy="selectin",
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_tasks_project_status", project_id, status),
        Index("ix_tasks_project_assignee", project_id, assignee_id),
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}', project_id={self.project_id})>"
