"""Analytics schemas for task distribution, workload, completion trends, and project KPIs."""

from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TaskStatusDistribution(BaseModel):
    """Task distribution across statuses (legacy key-count map)."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    todo: int = Field(default=0, description="Tasks in TODO or backlog state")
    in_progress: int = Field(default=0, description="Tasks actively in progress")
    in_review: int = Field(default=0, description="Tasks under code review or QA")
    done: int = Field(default=0, description="Completed tasks")


class StatusDistributionItem(BaseModel):
    """Named task distribution item for charts."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str = Field(..., description="Status name, e.g. Todo, In Progress, Review, Done")
    value: int = Field(default=0, description="Count of tasks in this status")


class PriorityDistributionItem(BaseModel):
    """Named priority distribution item for charts."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str = Field(..., description="Priority name, e.g. High, Medium, Low")
    value: int = Field(default=0, description="Count of tasks in this priority")


class WorkloadItem(BaseModel):
    """Workload representation per assignee."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    user_id: uuid.UUID = Field(..., description="UUID of the assignee")
    user_name: str = Field(..., description="Full name or display name of the assignee")
    assigned_tasks: int = Field(default=0, description="Number of tasks currently assigned to this user")


class MemberWorkloadItem(BaseModel):
    """Detailed workload item matching dashboard table."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    member_id: str = Field(..., alias="memberId", description="User ID")
    member_name: str = Field(..., alias="memberName", description="User display name")
    assigned: int = Field(default=0, description="Total assigned tasks")
    completed: int = Field(default=0, description="Completed tasks")
    overdue: int = Field(default=0, description="Overdue tasks")


class CompletionTrendItem(BaseModel):
    """Daily task completion metric."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    date: str = Field(..., description="Completion date in YYYY-MM-DD format")
    completed_tasks: int = Field(default=0, description="Number of tasks completed on this date")
    completed: int = Field(default=0, description="Alias matching frontend chart")

    def __init__(self, **data: Any) -> None:
        if "completed" in data and "completed_tasks" not in data:
            data["completed_tasks"] = data["completed"]
        elif "completed_tasks" in data and "completed" not in data:
            data["completed"] = data["completed_tasks"]
        super().__init__(**data)


class KpiMetrics(BaseModel):
    """High-level KPI metrics."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    total_projects: int = Field(default=0, alias="totalProjects")
    active_projects: int = Field(default=0, alias="activeProjects")
    completed_projects: int = Field(default=0, alias="completedProjects")
    total_tasks: int = Field(default=0, alias="totalTasks")
    completed_tasks: int = Field(default=0, alias="completedTasks")
    overdue_tasks: int = Field(default=0, alias="overdueTasks")
    active_members: int = Field(default=0, alias="activeMembers")
    completion_rate: int = Field(default=0, alias="completionRate")


class ProjectSummaryItem(BaseModel):
    """Summary of a project for analytics selector."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    key: Optional[str] = None


class ProjectProgressItem(BaseModel):
    """Progress percentage per project."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    progress: int
    status: str


class AnalyticsData(BaseModel):
    """Aggregated analytics data payload serving both backend standards and full frontend dashboard."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    # Core backend fields
    task_status: TaskStatusDistribution = Field(..., description="Task distribution by status")
    workload: List[WorkloadItem] = Field(default_factory=list, description="Workload per team member")
    completion_trend: List[CompletionTrendItem] = Field(default_factory=list, description="Daily completion trend")

    # Rich frontend fields
    kpi: KpiMetrics = Field(default_factory=KpiMetrics, description="KPI overview cards")
    task_status_distribution: List[StatusDistributionItem] = Field(
        default_factory=list,
        alias="taskStatusDistribution",
        description="List formatted for PieChart",
    )
    priority_distribution: List[PriorityDistributionItem] = Field(
        default_factory=list,
        alias="priorityDistribution",
        description="Priority breakdown for PieChart",
    )
    workload_distribution: List[MemberWorkloadItem] = Field(
        default_factory=list,
        alias="workloadDistribution",
        description="Workload table items",
    )
    task_completion_trend: List[CompletionTrendItem] = Field(
        default_factory=list,
        alias="taskCompletionTrend",
        description="Completion trend matching frontend line chart",
    )
    project_progress: List[ProjectProgressItem] = Field(
        default_factory=list,
        alias="projectProgress",
        description="Project progress list",
    )
    projects_list: List[ProjectSummaryItem] = Field(
        default_factory=list,
        alias="projectsList",
        description="List of projects for filter dropdown",
    )
    selected_project_id: str = Field("all", alias="selectedProjectId")


class AnalyticsResponse(BaseModel):
    """Envelope response for GET /analytics endpoint."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    success: bool = Field(default=True, description="Success status")
    message: str = Field(
        default="Analytics data retrieved successfully.",
        description="Success message",
    )
    data: AnalyticsData = Field(..., description="Analytics data payload")
