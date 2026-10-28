"""Project and ProjectMember SQLAlchemy 2.0 ORM Models."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User

# Association table for Project <-> User Many-to-Many membership
project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base):
    """Project entity model representing a team workspace project."""

    __tablename__ = "projects"

    # UUID Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    # Project Information
    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    key: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
        index=True,
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    tags: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    columns: Mapped[Optional[List[dict]]] = mapped_column(
        JSON,
        default=list,
        nullable=True,
    )

    # Dates
    start_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    end_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # Foreign Key: Creator / Owner
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    @property
    def owner_id(self) -> uuid.UUID:
        """Alias property matching owner_id."""
        return self.created_by

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
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="owned_projects",
        foreign_keys=[created_by],
        lazy="selectin",
    )
    members: Mapped[List["User"]] = relationship(
        "User",
        secondary=project_members,
        back_populates="assigned_projects",
        lazy="selectin",
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_projects_name_lower", func.lower(name), unique=True),
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status}')>"
