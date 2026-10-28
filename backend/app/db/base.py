"""SQLAlchemy 2.0 Declarative Base Configuration."""

from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Automatically generate __tablename__ based on lowercase class name."""
        return cls.__name__.lower()
