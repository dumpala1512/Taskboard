"""Activity SQLAlchemy 2.0 ORM Model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class Activity(Base):
    """Activity entity model representing audit log / event feed entries."""

    __tablename__ = "activities"

    # UUID Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    # Activity Type (e.g. TASK_CREATED, TASK_STATUS_CHANGED, TASK_COMPLETED, TASK_DELETED, etc.)
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # User who triggered the action
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Project ID (nullable for system or non-project actions)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Task ID (nullable, plain UUID so audit trail persists if task deleted)
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    # Details / summary text
    details: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Optional status transitions
    from_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    to_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # Task title cached for display even after deletion
    task_title: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
        lazy="selectin",
    )
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        foreign_keys=[project_id],
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_activities_project_created", "project_id", "created_at"),
        Index("ix_activities_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Activity(id={self.id}, type='{self.type}', user_id={self.user_id}, project_id={self.project_id})>"

