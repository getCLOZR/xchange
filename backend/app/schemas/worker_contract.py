from typing import Any

from pydantic import BaseModel, Field


class WorkerHealthResponse(BaseModel):
    status: str
    agent_name: str
    version: str


class WorkerExecuteRequest(BaseModel):
    session_id: int = Field(..., ge=1)
    capability: str = Field(..., min_length=1)
    task_type: str = Field(..., min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)


class WorkerExecuteSuccessResponse(BaseModel):
    status: str = "success"
    session_id: int
    agent_name: str
    capability: str
    task_type: str
    output_payload: dict[str, Any]
    execution_time_ms: float = Field(..., ge=0)


class WorkerExecuteErrorResponse(BaseModel):
    status: str = "error"
    session_id: int
    error_code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
