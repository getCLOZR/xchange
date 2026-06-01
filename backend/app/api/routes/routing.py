from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.routing import RoutingPreviewResponse
from app.services.routing_service import preview_routing

router = APIRouter(prefix="/routing", tags=["routing"])


@router.get("/preview", response_model=RoutingPreviewResponse)
def routing_preview(
    capability: str = Query(..., min_length=1, description="Capability to route"),
    requester_agent_id: Optional[int] = Query(
        default=None,
        ge=1,
        description="Optional requester to exclude from candidates",
    ),
    db: Session = Depends(get_db),
):
    """Preview ranked workers and selection without creating a session."""
    return preview_routing(
        db,
        capability=capability,
        requester_agent_id=requester_agent_id,
    )
