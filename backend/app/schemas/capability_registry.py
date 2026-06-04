from typing import Optional

from pydantic import BaseModel, Field


class CapabilityProvider(BaseModel):
    agent_id: int
    agent_name: str
    endpoint_url: str
    is_active: bool
    is_healthy: bool
    cost_credits: int
    avg_response_time_ms: Optional[float] = None
    total_sessions: int = 0
    successful_sessions: int = 0
    failed_sessions: int = 0
    success_rate: float = 0.0
    input_schema: dict = Field(default_factory=dict)
    output_schema: dict = Field(default_factory=dict)


class CapabilityGroup(BaseModel):
    name: str
    provider_count: int
    healthy_provider_count: int
    providers: list[CapabilityProvider] = Field(default_factory=list)


class CapabilityRegistryResponse(BaseModel):
    capabilities: list[CapabilityGroup] = Field(default_factory=list)
