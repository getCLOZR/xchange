from datetime import datetime

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
    created_at: datetime
    capabilities: list[CapabilityResponse]

    model_config = {"from_attributes": True}


class AgentSearchResponse(BaseModel):
    agents: list[AgentResponse]
    count: int
