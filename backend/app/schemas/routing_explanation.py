"""Structured routing explanations for preview and session inspection."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class RoutingWorkerRef(BaseModel):
    agent_id: int
    agent_name: str


class RoutingExplainedCandidate(BaseModel):
    agent_id: int
    agent_name: str
    is_active: bool
    is_healthy: bool
    success_rate: float
    avg_response_time_ms: Optional[float] = None
    cost_credits: int = 0
    score: Optional[float] = None
    score_breakdown: Optional[dict[str, float]] = None
    eligible: bool
    rank: Optional[int] = None
    exclusion_reasons: list[str] = Field(default_factory=list)
    exclusion_message: Optional[str] = None


class RoutingExplanationResponse(BaseModel):
    capability: str
    filters_applied: list[str] = Field(default_factory=list)
    candidate_count: int = 0
    candidates: list[RoutingExplainedCandidate] = Field(default_factory=list)
    selected_worker: Optional[RoutingWorkerRef] = None
    selection_reason: str = ""
    # Backward-compatible fields used by existing clients
    filters: list[str] = Field(default_factory=list)
    selected_agent_id: Optional[int] = None
    routing_trace: dict[str, Any] = Field(default_factory=dict)


class SessionRoutingResponse(RoutingExplanationResponse):
    session_id: int
    dispatch_attempts: list[dict[str, Any]] = Field(default_factory=list)
