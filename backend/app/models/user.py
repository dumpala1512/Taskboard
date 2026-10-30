"""User SQLAlchemy 2.0 ORM Model."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import uuid
from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class User(Base):
    """User entity model representing application users and their roles."""

    __tablename__ = "users"

    # UUID Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    # User Information
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="member",
        index=True,
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

    @property
    def name(self) -> str:
        """Alias property matching name."""
        return self.full_name

    # Relationships with Projects
    owned_projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="owner",
        foreign_keys="Project.created_by",
        lazy="selectin",
    )
    assigned_projects: Mapped[List["Project"]] = relationship(
        "Project",
        secondary="project_members",
        back_populates="members",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_users_email_lower", func.lower(email), unique=True),
        Index("ix_users_role", role),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
