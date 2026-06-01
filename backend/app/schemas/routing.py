from typing import Any, Optional

from pydantic import BaseModel, Field


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
    filters: list[str]
    candidates: list[RoutingCandidateScore]
    selected_agent_id: Optional[int] = None
    selection_reason: str
    routing_trace: dict[str, Any]


class RoutingTrace(BaseModel):
    """Structured routing trace stored on sessions."""

    capability: str
    filters: list[str] = Field(default_factory=list)
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    selected_agent_id: Optional[int] = None
    selection_reason: Optional[str] = None
    attempts: list[dict[str, Any]] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
