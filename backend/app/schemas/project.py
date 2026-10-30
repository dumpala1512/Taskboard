"""Project management and project assignment Pydantic v2 schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_PROJECT_STATUSES = {"PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"}


def normalize_kanban_columns(v: Any) -> Optional[List[Dict[str, Any]]]:
    """Helper to normalize Kanban column definitions to {id: str, title: str}."""
    if v is None:
        return None
    if not isinstance(v, list):
        return None
    normalized: List[Dict[str, Any]] = []
    for item in v:
        if isinstance(item, str) and item.strip():
            clean = item.strip()
            col_id = clean.upper().replace(" ", "_")
            normalized.append({"id": col_id, "title": clean})
        elif isinstance(item, dict):
            title = item.get("title") or item.get("name") or item.get("label") or item.get("id") or "Column"
            col_id = item.get("id") or item.get("key") or str(title).upper().replace(" ", "_")
            normalized.append({"id": str(col_id), "title": str(title)})
    return normalized


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
    columns: Optional[List[Dict[str, Any]]] = Field(default=None, description="Kanban columns")
    start_date: Optional[str] = Field(default=None, alias="startDate", description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default=None, alias="dueDate", description="End/Due date (YYYY-MM-DD)")

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> str:
        if v is None:
            return "ACTIVE"
        if not isinstance(v, str) or not v.strip():
            return "ACTIVE"
        norm = v.strip().upper()
        if norm not in VALID_PROJECT_STATUSES:
            raise ValueError(f"Project status must be one of: {', '.join(sorted(VALID_PROJECT_STATUSES))}")
        return norm

    @field_validator("columns", mode="before")
    @classmethod
    def validate_columns(cls, v: Any) -> Optional[List[Dict[str, Any]]]:
        return normalize_kanban_columns(v)

    @model_validator(mode="before")
    @classmethod
    def sanitize_optional_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            for key, val in list(values.items()):
                if val == "" or (isinstance(val, str) and not val.strip()):
                    if key != "name":
                        values[key] = None
        return values


class UpdateProjectRequest(BaseModel):
    """Payload to update an existing project."""

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        json_schema_extra={
            "example": {
                "name": "Updated Project Title",
                "status": "ACTIVE",
            }
        },
    )

    name: Optional[str] = Field(default=None, max_length=255, description="Updated project title")
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

    @model_validator(mode="before")
    @classmethod
    def sanitize_optional_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            for key, val in list(values.items()):
                # If value is empty string, whitespace, or invalid placeholder, sanitize to None
                if val == "" or (isinstance(val, str) and not val.strip()):
                    values[key] = None
                elif isinstance(val, list):
                    clean_list = [
                        item for item in val
                        if item is not None and item != "" and item != {}
                    ]
                    values[key] = clean_list if clean_list else None
        return values

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            return None
        norm = v.strip().upper()
        if norm not in VALID_PROJECT_STATUSES:
            raise ValueError(f"Project status must be one of: {', '.join(sorted(VALID_PROJECT_STATUSES))}")
        return norm

    @field_validator("columns", mode="before")
    @classmethod
    def validate_columns(cls, v: Any) -> Optional[List[Dict[str, Any]]]:
        return normalize_kanban_columns(v)


class ProjectMemberItem(BaseModel):
    """Detailed summary of a project member."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: uuid.UUID = Field(..., description="User unique identifier")
    name: str = Field(..., description="User full name or display name")
    email: str = Field(..., description="User email address")
    role: str = Field(default="MEMBER", description="User system role")
    avatar: Optional[str] = Field(default=None, description="User avatar image URL")


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
    members_details: List[ProjectMemberItem] = Field(default_factory=list, description="Assigned team members with details")
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
            members_details: List[Dict[str, Any]] = []
            if hasattr(data, "members") and data.members:
                for m in data.members:
                    if hasattr(m, "id"):
                        member_ids.append(m.id)
                        members_details.append({
                            "id": m.id,
                            "name": getattr(m, "full_name", None) or getattr(m, "name", None) or m.email,
                            "email": m.email,
                            "role": (getattr(m, "role", "MEMBER") or "MEMBER").upper(),
                            "avatar": getattr(m, "avatar", None),
                        })
                    elif isinstance(m, (uuid.UUID, str)):
                        try:
                            uid = uuid.UUID(str(m))
                            member_ids.append(uid)
                        except ValueError:
                            pass

            creator = getattr(data, "created_by", None) or getattr(data, "owner_id", None)
            owner = getattr(data, "owner_id", None) or creator

            # Include the owner in members_details if loaded and not already present
            owner_obj = getattr(data, "owner", None)
            if owner_obj and hasattr(owner_obj, "id"):
                owner_uid = owner_obj.id
                if not any(item["id"] == owner_uid for item in members_details):
                    members_details.insert(0, {
                        "id": owner_obj.id,
                        "name": getattr(owner_obj, "full_name", None) or getattr(owner_obj, "name", None) or owner_obj.email,
                        "email": owner_obj.email,
                        "role": (getattr(owner_obj, "role", "ADMIN") or "ADMIN").upper(),
                        "avatar": getattr(owner_obj, "avatar", None),
                    })

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
                "members_details": members_details,
                "tags": getattr(data, "tags", []) or [],
                "columns": normalize_kanban_columns(getattr(data, "columns", None)),
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
            if "columns" in data and data["columns"] is not None:
                data["columns"] = normalize_kanban_columns(data["columns"])
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
