"""Pydantic v2 schemas for health endpoint."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Health check response schema."""

    model_config = ConfigDict(frozen=True)

    status: Literal["ok"] = Field(default="ok", description="Liveness status")
    service: str = Field(..., description="Service identifier")
    timestamp: str = Field(..., description="Current server ISO 8601 timestamp")
