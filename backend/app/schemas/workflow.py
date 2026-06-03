from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class WorkflowStepTrace(BaseModel):
    step_index: int
    capability: str
    task_type: Optional[str] = None
    session_id: Optional[int] = None
    worker_agent_id: Optional[int] = None
    status: str


class WorkflowTraceResponse(BaseModel):
    workflow_id: str
    workflow_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    steps: list[WorkflowStepTrace] = Field(default_factory=list)
    question: Optional[str] = None


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowTraceResponse]
    count: int
