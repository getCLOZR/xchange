from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.activity import ActivityListResponse, ActivityLogResponse
from app.services import activity_service

router = APIRouter(tags=["activity"])


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
