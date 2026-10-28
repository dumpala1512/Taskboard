"""Common standardized API response schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SuccessResponse(BaseModel):
    """Standardized API success wrapper response."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(..., description="Human-readable response message")
    data: Optional[Any] = Field(default=None, description="Response payload")


class ErrorResponse(BaseModel):
    """Standardized API error response."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=False, description="Operation success status")
    error: str = Field(..., description="Error identifier or summary")
    message: str = Field(..., description="Descriptive error explanation")
    code: Optional[str] = Field(default=None, description="Machine-readable error code")
    request_id: Optional[str] = Field(default=None, description="Trace request identifier")
    details: Optional[Any] = Field(default=None, description="Detailed validation or error list")


class ValidationErrorResponse(BaseModel):
    """Standardized request validation failure response."""

    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=False, description="Operation success status")
    error: str = Field(default="Validation Error", description="Error category")
    message: str = Field(default="Request validation failed", description="Error message")
    request_id: Optional[str] = Field(default=None, description="Trace request identifier")
    details: List[Dict[str, Any]] = Field(..., description="Pydantic validation issue breakdown")
