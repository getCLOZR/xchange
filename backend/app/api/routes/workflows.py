from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.workflow import WorkflowListResponse, WorkflowTraceResponse
from app.services import workflow_service

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/recent", response_model=WorkflowListResponse)
def list_recent_workflows(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return recent workflow traces reconstructed from activity logs."""
    workflows = workflow_service.list_recent_workflows(db, limit=limit)
    return WorkflowListResponse(workflows=workflows, count=len(workflows))
