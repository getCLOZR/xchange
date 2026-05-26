from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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
