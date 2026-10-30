"""Comment Pydantic Schemas for Task Discussion."""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator


class CreateCommentRequest(BaseModel):
    """Payload to create a new comment on a task."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The content of the comment (markdown/html supported)",
    )

    @model_validator(mode="before")
    @classmethod
    def validate_content(cls, values: dict) -> dict:
        if isinstance(values, dict) and "content" in values:
            if isinstance(values["content"], str):
                values["content"] = values["content"].strip()
        return values


class UpdateCommentRequest(BaseModel):
    """Payload to update an existing comment."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Updated comment content",
    )

    @model_validator(mode="before")
    @classmethod
    def validate_content(cls, values: dict) -> dict:
        if isinstance(values, dict) and "content" in values:
            if isinstance(values["content"], str):
                values["content"] = values["content"].strip()
        return values


class CommentAuthor(BaseModel):
    """Representation of the comment author."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")

    id: uuid.UUID = Field(..., description="Author's unique identifier")
    name: str = Field(..., description="Author's full name")
    role: str = Field(..., description="Author's role in the organization")


class CommentData(BaseModel):
    """Public representation of a task comment."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")

    id: uuid.UUID = Field(..., description="Unique comment identifier")
    content: str = Field(..., description="Comment content")
    created_at: datetime = Field(..., alias="createdAt", serialization_alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", serialization_alias="updatedAt", description="Last update timestamp")
    author: Optional[CommentAuthor] = Field(default=None, description="Author profile details")


class CommentResponseEnvelope(BaseModel):
    """Standardized response envelope for a single comment."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(default="Comment added successfully.", description="Response explanation")
    data: CommentData = Field(..., description="Comment payload")


class CommentsListResponseEnvelope(BaseModel):
    """Standardized response envelope for a list of task comments."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(default="Comments retrieved successfully.", description="Response explanation")
    data: List[CommentData] = Field(default_factory=list, description="List of comments")

