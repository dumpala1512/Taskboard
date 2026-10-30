"""Task Pydantic v2 schemas for request validation and response serialization."""

from datetime import datetime
from typing import Any, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_TASK_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}
VALID_TASK_TYPES = {"Feature", "Bug", "Improvement", "Research", "Documentation"}
TASK_TYPE_LOOKUP = {t.lower(): t for t in VALID_TASK_TYPES}


class CreateTaskRequest(BaseModel):
    """Payload to create a new task within a project."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    project_id: uuid.UUID = Field(..., alias="projectId", description="UUID of the parent project")
    title: str = Field(..., min_length=1, max_length=255, description="Title of the task")
    description: Optional[str] = Field(default=None, description="Detailed description of the task")
    status: Optional[str] = Field(default="TODO", description="Workflow status (e.g. BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE)")
    priority: Optional[str] = Field(default="MEDIUM", description="Task priority (LOW, MEDIUM, HIGH)")
    assignee_id: Optional[uuid.UUID] = Field(default=None, alias="assigneeId", description="User UUID assigned to the task")
    due_date: Optional[str] = Field(default=None, alias="dueDate", description="Due date in YYYY-MM-DD format")
    tags: Optional[List[str]] = Field(default_factory=list, description="List of task tags/labels")
    start_date: Optional[str] = Field(default=None, alias="startDate", description="Optional start date")
    estimated_time: Optional[float] = Field(default=None, alias="estimatedTime", description="Estimated hours")
    task_type: Optional[str] = Field(default=None, alias="taskType", description="Type of task (e.g. Feature, Bug)")
    points: Optional[int] = Field(default=None, ge=0, le=32, description="Story points (0 to 32)")

    @model_validator(mode="before")
    @classmethod
    def sanitize_optional_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Coerce empty strings or whitespace to None across all incoming fields
            for key, val in list(values.items()):
                if val == "" or (isinstance(val, str) and not val.strip()):
                    values[key] = None

            if not values.get("status"):
                values["status"] = "TODO"
            if not values.get("priority"):
                values["priority"] = "MEDIUM"
            if not values.get("tags"):
                values["tags"] = []

        return values

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: Any) -> str:
        if v is None:
            return "MEDIUM"
        if not isinstance(v, str) or not v.strip():
            return "MEDIUM"
        norm = v.strip().upper()
        if norm not in VALID_TASK_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(sorted(VALID_TASK_PRIORITIES))}")
        return norm

    @field_validator("task_type", mode="before")
    @classmethod
    def validate_task_type(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            return None
        norm = v.strip().lower()
        if norm not in TASK_TYPE_LOOKUP:
            raise ValueError(f"Task type must be one of: {', '.join(sorted(VALID_TASK_TYPES))}")
        return TASK_TYPE_LOOKUP[norm]


class TaskData(BaseModel):
    """Public representation of a task entity."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: uuid.UUID = Field(..., description="Unique task identifier")
    project_id: uuid.UUID = Field(..., description="Parent project identifier")
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(default=None, description="Task description")
    status: str = Field(default="TODO", description="Workflow status")
    priority: str = Field(default="MEDIUM", description="Task priority")
    assignee_id: Optional[uuid.UUID] = Field(default=None, description="Assigned user ID")
    due_date: Optional[str] = Field(default=None, description="Due date")
    tags: List[str] = Field(default_factory=list, description="Task tags")
    start_date: Optional[str] = Field(default=None, description="Start date")
    estimated_time: Optional[float] = Field(default=None, description="Estimated time")
    task_type: Optional[str] = Field(default=None, description="Task type")
    points: Optional[int] = Field(default=None, description="Story points")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class UpdateTaskRequest(BaseModel):
    """Payload to update an existing task."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Updated task title")
    description: Optional[str] = Field(default=None, description="Updated description")
    status: Optional[str] = Field(default=None, description="Updated workflow status")
    priority: Optional[str] = Field(default=None, description="Updated priority")
    assignee_id: Optional[uuid.UUID] = Field(default=None, alias="assigneeId", description="Updated assignee user ID")
    due_date: Optional[str] = Field(default=None, alias="dueDate", description="Updated due date")
    tags: Optional[List[str]] = Field(default=None, description="Updated tags")
    start_date: Optional[str] = Field(default=None, alias="startDate", description="Updated start date")
    estimated_time: Optional[float] = Field(default=None, alias="estimatedTime", description="Updated estimated hours")
    task_type: Optional[str] = Field(default=None, alias="taskType", description="Updated task type")
    points: Optional[int] = Field(default=None, ge=0, le=32, description="Updated story points (0 to 32)")

    @model_validator(mode="before")
    @classmethod
    def sanitize_optional_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            for key, val in list(values.items()):
                if val == "" or (isinstance(val, str) and not val.strip()):
                    values[key] = None
        return values

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            return None
        norm = v.strip().upper()
        if norm not in VALID_TASK_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(sorted(VALID_TASK_PRIORITIES))}")
        return norm

    @field_validator("task_type", mode="before")
    @classmethod
    def validate_task_type(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            return None
        norm = v.strip().lower()
        if norm not in TASK_TYPE_LOOKUP:
            raise ValueError(f"Task type must be one of: {', '.join(sorted(VALID_TASK_TYPES))}")
        return TASK_TYPE_LOOKUP[norm]


class TaskResponseEnvelope(BaseModel):
    """Standardized response envelope for a single task."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(default="Task retrieved successfully.", description="Response explanation")
    data: TaskData = Field(..., description="Task payload")


class PaginationMeta(BaseModel):
    """Pagination metadata model."""

    model_config = ConfigDict(extra="ignore")

    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=10, description="Records per page")
    total: int = Field(default=0, description="Total matching records")
    total_pages: int = Field(default=1, description="Total number of pages")


class TasksListResponseEnvelope(BaseModel):
    """Standardized response envelope for a list of tasks."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(default="Tasks retrieved successfully.", description="Response explanation")
    data: List[TaskData] = Field(default_factory=list, description="List of tasks")
    pagination: Optional[PaginationMeta] = Field(default=None, description="Pagination metadata")

