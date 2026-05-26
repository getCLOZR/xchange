from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.session import (
    DispatchRequest,
    DispatchResponse,
    SessionListResponse,
    SessionRead,
)
from app.services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/dispatch", response_model=DispatchResponse)
def dispatch_session(
    payload: DispatchRequest,
    db: Session = Depends(get_db),
):
    return session_service.dispatch_task(db, payload)


@router.get("", response_model=SessionListResponse)
def list_sessions(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    capability: Optional[str] = Query(default=None, description="Filter by capability"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sessions = session_service.list_sessions(
        db, status=status, capability=capability, limit=limit
    )
    return SessionListResponse(
        sessions=[SessionRead.model_validate(s) for s in sessions],
        count=len(sessions),
    )


@router.get("/{session_id}", response_model=SessionRead)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
):
    session = session_service.get_session_by_id(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return session
