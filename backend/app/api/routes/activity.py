from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.activity import (
    ActivityListResponse,
    ActivityLogCreate,
    ActivityLogResponse,
)
from app.services import activity_service

router = APIRouter(tags=["activity"])


@router.post("/activity/log", response_model=ActivityLogResponse, status_code=201)
def create_activity_log(
    payload: ActivityLogCreate,
    db: Session = Depends(get_db),
):
    """Record a workflow or demo activity event (e.g. workflow_started)."""
    entry = activity_service.log_activity(
        db,
        event_type=payload.event_type,
        message=payload.message,
        agent_id=payload.agent_id,
        metadata=payload.metadata,
    )
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/activity", response_model=ActivityListResponse)
def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    logs = activity_service.get_recent_activity(db, limit=limit)
    return ActivityListResponse(
        activity=[ActivityLogResponse.model_validate(log) for log in logs],
        count=len(logs),
    )
