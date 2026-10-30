"""Activity Schemas for API requests and response serialization."""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ActivityUserData(BaseModel):
    """User summary embedded in an activity item."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field(..., description="Display name of the user")
    avatar: Optional[str] = Field(None, description="Avatar image URL")


class ActivityItem(BaseModel):
    """Individual activity log entry serialized for client consumption."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str = Field(..., description="Unique activity UUID")
    type: str = Field(..., description="Activity action type")
    user: ActivityUserData = Field(..., description="User who performed the action")
    target: str = Field(..., description="Display summary / target entity description")
    details: str = Field(..., description="Detailed description of the activity")
    from_status: Optional[str] = Field(None, alias="fromStatus", description="Previous status if changed")
    to_status: Optional[str] = Field(None, alias="toStatus", description="New status if changed")
    task_title: Optional[str] = Field(None, alias="taskTitle", description="Title of the related task")
    project_id: Optional[str] = Field(None, alias="projectId", description="Associated project UUID")
    task_id: Optional[str] = Field(None, alias="taskId", description="Associated task UUID")
    timestamp: str = Field(..., description="ISO 8601 creation timestamp")
    created_at: str = Field(..., alias="createdAt", description="ISO 8601 creation timestamp")


class ActivitiesListResponseEnvelope(BaseModel):
    """Envelope wrapper for activities list responses."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool = Field(True, description="Indicates successful execution")
    message: str = Field("Activities retrieved successfully", description="Status message")
    data: List[ActivityItem] = Field(default_factory=list, description="List of activities")

