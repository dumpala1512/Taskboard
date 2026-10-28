"""Project management and project assignment Pydantic v2 schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator


class CreateProjectRequest(BaseModel):
    """Payload to create a new workspace project."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    name: str = Field(..., min_length=1, max_length=255, description="Project title")
    description: Optional[str] = Field(default=None, description="Detailed project description")
    status: Optional[str] = Field(default="ACTIVE", description="Project status (PLANNING, ACTIVE, ON_HOLD, COMPLETED)")
    key: Optional[str] = Field(default=None, description="Project key prefix (e.g. PRJ)")
    owner_id: Optional[uuid.UUID] = Field(default=None, alias="ownerId", description="Project owner user ID")
    members: Optional[List[uuid.UUID]] = Field(default_factory=list, description="Initial team member IDs")
    tags: Optional[List[str]] = Field(default_factory=list, description="Project tags")
    progress: Optional[int] = Field(default=0, description="Project progress percentage")
    start_date: Optional[str] = Field(default=None, alias="startDate", description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default=None, alias="dueDate", description="End/Due date (YYYY-MM-DD)")


class UpdateProjectRequest(BaseModel):
    """Payload to update an existing project."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Updated project title")
    description: Optional[str] = Field(default=None, description="Updated description")
    status: Optional[str] = Field(default=None, description="Updated status (PLANNING, ACTIVE, COMPLETED, ON_HOLD)")
    key: Optional[str] = Field(default=None, description="Updated key")
    owner_id: Optional[uuid.UUID] = Field(default=None, alias="ownerId", description="Updated owner user ID")
    members: Optional[List[uuid.UUID]] = Field(default=None, description="Updated member IDs")
    tags: Optional[List[str]] = Field(default=None, description="Updated tags")
    progress: Optional[int] = Field(default=None, description="Updated progress percentage")
    columns: Optional[List[Dict[str, Any]]] = Field(default=None, description="Updated board columns")
    start_date: Optional[str] = Field(default=None, alias="startDate", description="Updated start date")
    end_date: Optional[str] = Field(default=None, alias="dueDate", description="Updated end date")


class ProjectData(BaseModel):
    """Public representation of a project entity."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: uuid.UUID = Field(..., description="Project unique identifier")
    name: str = Field(..., description="Project name")
    key: Optional[str] = Field(default=None, description="Project key")
    description: Optional[str] = Field(default=None, description="Project description")
    status: str = Field(default="ACTIVE", description="Current project status")
    progress: int = Field(default=0, description="Project progress percentage")
    owner_id: uuid.UUID = Field(..., description="Project owner user ID")
    created_by: uuid.UUID = Field(..., description="User ID of creator")
    members: List[uuid.UUID] = Field(default_factory=list, description="Assigned team member IDs")
    tags: List[str] = Field(default_factory=list, description="Project tags")
    columns: Optional[List[Dict[str, Any]]] = Field(default=None, description="Kanban columns")
    start_date: Optional[str] = Field(default=None, description="Start date")
    end_date: Optional[str] = Field(default=None, description="End/Due date")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    @model_validator(mode="before")
    @classmethod
    def populate_custom_fields(cls, data: Any) -> Any:
        if hasattr(data, "__dict__") or not isinstance(data, dict):
            member_ids: List[uuid.UUID] = []
            if hasattr(data, "members") and data.members:
                for m in data.members:
                    if hasattr(m, "id"):
                        member_ids.append(m.id)
                    elif isinstance(m, (uuid.UUID, str)):
                        try:
                            member_ids.append(uuid.UUID(str(m)))
                        except ValueError:
                            pass

            creator = getattr(data, "created_by", None) or getattr(data, "owner_id", None)
            owner = getattr(data, "owner_id", None) or creator

            return {
                "id": data.id,
                "name": data.name,
                "key": getattr(data, "key", None),
                "description": getattr(data, "description", None),
                "status": getattr(data, "status", "ACTIVE") or "ACTIVE",
                "progress": getattr(data, "progress", 0) or 0,
                "owner_id": owner,
                "created_by": creator,
                "members": member_ids,
                "tags": getattr(data, "tags", []) or [],
                "columns": getattr(data, "columns", None),
                "start_date": getattr(data, "start_date", None),
                "end_date": getattr(data, "end_date", None),
                "created_at": getattr(data, "created_at", None),
                "updated_at": getattr(data, "updated_at", None),
            }
        elif isinstance(data, dict):
            if "owner_id" not in data or data["owner_id"] is None:
                data["owner_id"] = data.get("created_by")
            if "created_by" not in data or data["created_by"] is None:
                data["created_by"] = data.get("owner_id")
        return data


class ProjectResponseEnvelope(BaseModel):
    """Standard envelope for single project responses."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation status")
    message: str = Field(..., description="Response message")
    data: ProjectData = Field(..., description="Project data payload")


class ProjectsListResponseEnvelope(BaseModel):
    """Standard envelope for list of projects."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation status")
    message: str = Field(default="Projects retrieved successfully.", description="Response message")
    data: List[ProjectData] = Field(default_factory=list, description="List of projects")


class AssignProjectsRequest(BaseModel):
    """Payload to assign multiple projects to a user."""

    model_config = ConfigDict(extra="ignore")

    project_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of project UUIDs to assign")


class AssignProjectsResponse(BaseModel):
    """Response envelope for project assignment."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation status")
    message: str = Field(default="Projects assigned successfully.", description="Status message")
    data: Dict[str, Any] = Field(..., description="Assignment summary with user_id and count")


class RemoveProjectAssignmentRequest(BaseModel):
    """Payload to unassign a project from a user."""

    model_config = ConfigDict(extra="ignore")

    project_id: uuid.UUID = Field(..., description="Project UUID to unassign")


class RemoveProjectAssignmentResponse(BaseModel):
    """Response envelope for removing project assignment."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation status")
    message: str = Field(default="Project assignment removed successfully.", description="Status message")
