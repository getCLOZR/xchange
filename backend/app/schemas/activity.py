from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ActivityLogCreate(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    agent_id: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None


class ActivityLogResponse(BaseModel):
    id: int
    event_type: str
    message: str
    agent_id: Optional[int]
    metadata: Optional[dict[str, Any]] = Field(
        default=None,
        validation_alias="event_metadata",
    )
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ActivityListResponse(BaseModel):
    activity: list[ActivityLogResponse]
    count: int
