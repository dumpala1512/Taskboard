"""Analytics schemas for task distribution, workload, and completion trends."""

from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TaskStatusDistribution(BaseModel):
    """Task distribution across statuses."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    todo: int = Field(default=0, description="Tasks in TODO or backlog state")
    in_progress: int = Field(default=0, description="Tasks actively in progress")
    in_review: int = Field(default=0, description="Tasks under code review or QA")
    done: int = Field(default=0, description="Completed tasks")


class WorkloadItem(BaseModel):
    """Workload representation per assignee."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    user_id: uuid.UUID = Field(..., description="UUID of the assignee")
    user_name: str = Field(..., description="Full name or display name of the assignee")
    assigned_tasks: int = Field(default=0, description="Number of tasks currently assigned to this user")


class CompletionTrendItem(BaseModel):
    """Daily task completion metric."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    date: str = Field(..., description="Completion date in YYYY-MM-DD format")
    completed_tasks: int = Field(default=0, description="Number of tasks completed on this date")


class AnalyticsData(BaseModel):
    """Aggregated analytics data payload."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    task_status: TaskStatusDistribution = Field(..., description="Task distribution by status")
    workload: List[WorkloadItem] = Field(default_factory=list, description="Workload per team member")
    completion_trend: List[CompletionTrendItem] = Field(default_factory=list, description="Daily completion trend")


class AnalyticsResponse(BaseModel):
    """Envelope response for GET /analytics endpoint."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    success: bool = Field(default=True, description="Success status")
    message: str = Field(
        default="Analytics data retrieved successfully.",
        description="Success message",
    )
    data: AnalyticsData = Field(..., description="Analytics data payload")

