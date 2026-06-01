from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ActivityLogCreate(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    agent_id: Optional[int] = None


class ActivityLogResponse(BaseModel):
    id: int
    event_type: str
    message: str
    agent_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    activity: list[ActivityLogResponse]
    count: int
