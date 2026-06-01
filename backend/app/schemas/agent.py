from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.capability import CapabilityCreate, CapabilityResponse


class AgentRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    endpoint_url: HttpUrl
    owner_name: str = Field(..., min_length=1, max_length=255)
    version: str = Field(..., min_length=1, max_length=50)
    cost_credits: int = Field(default=0, ge=0)
    capabilities: list[CapabilityCreate] = Field(..., min_length=1)


class AgentResponse(BaseModel):
    id: int
    name: str
    description: str
    endpoint_url: str
    owner_name: str
    version: str
    cost_credits: int
    is_active: bool
    is_healthy: bool
    last_health_check: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    avg_response_time_ms: Optional[float] = None
    total_sessions: int
    successful_sessions: int
    failed_sessions: int
    created_at: datetime
    capabilities: list[CapabilityResponse]

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]
    count: int


class AgentSearchResponse(BaseModel):
    agents: list[AgentResponse]
    count: int


class AgentHealthStatus(BaseModel):
    agent_id: int
    name: str
    endpoint_url: str
    active: bool
    is_healthy: bool
    last_health_check: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    avg_response_time_ms: Optional[float] = None
    total_sessions: int
    successful_sessions: int
    failed_sessions: int


class HealthCheckResponse(BaseModel):
    agent_id: int
    is_healthy: bool
    response_time_ms: Optional[float] = None
    checked_at: datetime
    error_message: Optional[str] = None


class BulkHealthCheckResponse(BaseModel):
    checked_count: int
    healthy_count: int
    unhealthy_count: int
    results: list[HealthCheckResponse]
