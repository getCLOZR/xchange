from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class DispatchRequest(BaseModel):
    requester_agent_id: int = Field(..., ge=1)
    capability: str = Field(..., min_length=1, max_length=255)
    task_type: str = Field(..., min_length=1, max_length=255)
    input_payload: dict[str, Any] = Field(default_factory=dict)


class DispatchResponse(BaseModel):
    session_id: int
    status: str
    worker_agent_id: Optional[int] = None
    capability: str
    task_type: str
    output_payload: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None


class SessionRead(BaseModel):
    id: int
    requester_agent_id: int
    worker_agent_id: Optional[int]
    capability: str
    task_type: str
    status: str
    input_payload: dict[str, Any]
    output_payload: Optional[dict[str, Any]]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: list[SessionRead]
    count: int
