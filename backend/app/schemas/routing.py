from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.routing_explanation import (
    RoutingExplainedCandidate,
    RoutingWorkerRef,
)


class RoutingCandidateScore(BaseModel):
    agent_id: int
    name: str
    success_rate: float
    avg_response_time_ms: Optional[float] = None
    cost_credits: int
    is_healthy: bool
    score: float
    score_breakdown: dict[str, float]


class RoutingPreviewResponse(BaseModel):
    capability: str
    filters_applied: list[str] = Field(default_factory=list)
    candidate_count: int = 0
    candidates: list[RoutingExplainedCandidate] = Field(default_factory=list)
    selected_worker: Optional[RoutingWorkerRef] = None
    selection_reason: str = ""
    filters: list[str] = Field(default_factory=list)
    selected_agent_id: Optional[int] = None
    routing_trace: dict[str, Any] = Field(default_factory=dict)
    legacy_candidates: list[RoutingCandidateScore] = Field(default_factory=list)


class RoutingTrace(BaseModel):
    """Structured routing trace stored on sessions."""

    capability: str
    filters: list[str] = Field(default_factory=list)
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    excluded_candidates: list[dict[str, Any]] = Field(default_factory=list)
    candidate_count: int = 0
    selected_agent_id: Optional[int] = None
    selection_reason: Optional[str] = None
    attempts: list[dict[str, Any]] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
