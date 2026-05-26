from datetime import datetime
from typing import Any, Optional
from urllib.parse import urljoin

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models.agent import Agent
from app.models.session import Session
from app.schemas.session import DispatchRequest, DispatchResponse, SessionRead
from app.services.activity_service import log_activity
from app.services.agent_service import get_agent_by_id, search_agents_by_capability

WORKER_TIMEOUT_SECONDS = 30.0

SESSION_PENDING = "pending"
SESSION_RUNNING = "running"
SESSION_COMPLETED = "completed"
SESSION_FAILED = "failed"


def _utcnow() -> datetime:
    return datetime.utcnow()


def _session_to_dispatch_response(session: Session) -> DispatchResponse:
    return DispatchResponse(
        session_id=session.id,
        status=session.status,
        worker_agent_id=session.worker_agent_id,
        capability=session.capability,
        task_type=session.task_type,
        output_payload=session.output_payload,
        error_message=session.error_message,
    )


def _worker_execute_url(endpoint_url: str) -> str:
    base = endpoint_url.rstrip("/") + "/"
    return urljoin(base, "execute")


def dispatch_task(db: DbSession, payload: DispatchRequest) -> DispatchResponse:
    """Route a task to a worker agent and store the session lifecycle."""
    requester = get_agent_by_id(db, payload.requester_agent_id)
    if requester is None:
        raise HTTPException(
            status_code=404,
            detail=f"Requester agent {payload.requester_agent_id} not found",
        )

    workers = search_agents_by_capability(db, payload.capability)
    worker = _select_worker(workers, payload.requester_agent_id)

    if worker is None:
        return _fail_no_worker(db, payload, requester.name)

    session = Session(
        requester_agent_id=payload.requester_agent_id,
        worker_agent_id=worker.id,
        capability=payload.capability,
        task_type=payload.task_type,
        status=SESSION_PENDING,
        input_payload=payload.input_payload,
    )
    db.add(session)
    db.flush()

    log_activity(
        db,
        event_type="session_created",
        message=(
            f"Session {session.id} created: requester '{requester.name}' "
            f"requested capability '{payload.capability}'"
        ),
        agent_id=payload.requester_agent_id,
    )
    log_activity(
        db,
        event_type="worker_selected",
        message=(
            f"Session {session.id}: worker '{worker.name}' (id={worker.id}) "
            f"selected for capability '{payload.capability}'"
        ),
        agent_id=worker.id,
    )

    session.status = SESSION_RUNNING
    session.started_at = _utcnow()
    session.updated_at = _utcnow()
    db.flush()

    log_activity(
        db,
        event_type="task_dispatched",
        message=(
            f"Session {session.id}: task '{payload.task_type}' dispatched to "
            f"worker '{worker.name}' at {worker.endpoint_url}"
        ),
        agent_id=worker.id,
    )

    try:
        output = _call_worker_execute(
            worker=worker,
            session_id=session.id,
            task_type=payload.task_type,
            capability=payload.capability,
            input_payload=payload.input_payload,
        )
        session.status = SESSION_COMPLETED
        session.output_payload = output
        session.completed_at = _utcnow()
        session.updated_at = _utcnow()
        log_activity(
            db,
            event_type="task_completed",
            message=f"Session {session.id}: task '{payload.task_type}' completed successfully",
            agent_id=worker.id,
        )
    except Exception as exc:
        session.status = SESSION_FAILED
        session.error_message = str(exc)
        session.completed_at = _utcnow()
        session.updated_at = _utcnow()
        log_activity(
            db,
            event_type="task_failed",
            message=f"Session {session.id}: task failed — {exc}",
            agent_id=worker.id,
        )

    db.commit()
    db.refresh(session)
    return _session_to_dispatch_response(session)


def _select_worker(
    workers: list[Agent], requester_agent_id: int
) -> Optional[Agent]:
    """Pick the first active worker that is not the requester."""
    for agent in workers:
        if agent.id != requester_agent_id:
            return agent
    return None


def _fail_no_worker(
    db: DbSession, payload: DispatchRequest, requester_name: str
) -> DispatchResponse:
    session = Session(
        requester_agent_id=payload.requester_agent_id,
        worker_agent_id=None,
        capability=payload.capability,
        task_type=payload.task_type,
        status=SESSION_FAILED,
        input_payload=payload.input_payload,
        error_message=(
            f"No active worker found for capability '{payload.capability}'"
        ),
        completed_at=_utcnow(),
    )
    db.add(session)
    db.flush()

    log_activity(
        db,
        event_type="task_failed",
        message=(
            f"Session {session.id}: no worker available for capability "
            f"'{payload.capability}' (requester '{requester_name}')"
        ),
        agent_id=payload.requester_agent_id,
    )
    db.commit()
    db.refresh(session)

    raise HTTPException(
        status_code=404,
        detail={
            "message": session.error_message,
            "session": _session_to_dispatch_response(session).model_dump(),
        },
    )


def _call_worker_execute(
    worker: Agent,
    session_id: int,
    task_type: str,
    capability: str,
    input_payload: dict[str, Any],
) -> dict[str, Any]:
    url = _worker_execute_url(worker.endpoint_url)
    body = {
        "session_id": session_id,
        "task_type": task_type,
        "capability": capability,
        "input_payload": input_payload,
    }

    with httpx.Client(timeout=WORKER_TIMEOUT_SECONDS) as client:
        response = client.post(url, json=body)

    if response.status_code >= 400:
        raise RuntimeError(
            f"Worker returned HTTP {response.status_code}: {response.text[:500]}"
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError("Worker response was not valid JSON") from exc

    if not isinstance(data, dict):
        raise RuntimeError("Worker response must be a JSON object")

    return data


def list_sessions(
    db: DbSession,
    status: Optional[str] = None,
    capability: Optional[str] = None,
    limit: int = 50,
) -> list[Session]:
    stmt = select(Session).order_by(Session.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Session.status == status)
    if capability:
        stmt = stmt.where(Session.capability == capability)
    return list(db.scalars(stmt).all())


def get_session_by_id(db: DbSession, session_id: int) -> Optional[Session]:
    return db.get(Session, session_id)
