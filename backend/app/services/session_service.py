from datetime import datetime
from time import perf_counter
from typing import Any, Optional
from urllib.parse import urljoin

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models.agent import Agent
from app.models.session import Session
from app.schemas.session import DispatchRequest, DispatchResponse, SessionRead
from app.services.activity_service import log_activity
from app.services.agent_service import get_agent_by_id
from app.services.routing_service import RoutingSelection, select_ranked_workers

settings = get_settings()
WORKER_TIMEOUT_SECONDS = settings.worker_http_timeout_seconds

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
        routing_trace=session.routing_trace,
    )


def _worker_execute_url(endpoint_url: str) -> str:
    base = endpoint_url.rstrip("/") + "/"
    return urljoin(base, "execute")


def dispatch_task(db: DbSession, payload: DispatchRequest) -> DispatchResponse:
    """Route a task via routing engine with synchronous failover."""
    requester = get_agent_by_id(db, payload.requester_agent_id)
    if requester is None:
        raise HTTPException(
            status_code=404,
            detail=f"Requester agent {payload.requester_agent_id} not found",
        )

    selection = select_ranked_workers(
        db,
        capability=payload.capability,
        requester_agent_id=payload.requester_agent_id,
    )

    if not selection.ranked:
        return _fail_no_worker(db, payload, requester.name, selection)

    session = Session(
        requester_agent_id=payload.requester_agent_id,
        worker_agent_id=None,
        capability=payload.capability,
        task_type=payload.task_type,
        status=SESSION_PENDING,
        input_payload=payload.input_payload,
        routing_trace=selection.trace.to_dict(),
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

    session.status = SESSION_RUNNING
    session.started_at = _utcnow()
    session.updated_at = _utcnow()
    db.flush()

    trace = session.routing_trace or {}
    attempts: list[dict[str, Any]] = trace.setdefault("attempts", [])
    last_error: Optional[str] = None
    succeeded = False

    for ranked in selection.ranked:
        worker = ranked.agent
        session.worker_agent_id = worker.id
        session.updated_at = _utcnow()
        db.flush()

        if len(attempts) == 0:
            log_activity(
                db,
                event_type="worker_selected",
                message=(
                    f"Session {session.id}: worker '{worker.name}' (id={worker.id}) "
                    f"selected (score={ranked.score}) for '{payload.capability}'"
                ),
                agent_id=worker.id,
            )

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
            output, elapsed_ms = _call_worker_execute(
                worker=worker,
                session_id=session.id,
                task_type=payload.task_type,
                capability=payload.capability,
                input_payload=payload.input_payload,
            )
            _apply_worker_session_metrics(
                worker, succeeded=True, observed_ms=elapsed_ms
            )
            attempts.append(
                {
                    "agent_id": worker.id,
                    "name": worker.name,
                    "score": ranked.score,
                    "outcome": "succeeded",
                    "response_time_ms": elapsed_ms,
                }
            )
            session.status = SESSION_COMPLETED
            session.output_payload = output
            session.completed_at = _utcnow()
            session.updated_at = _utcnow()
            trace["selected_agent_id"] = worker.id
            trace["selection_reason"] = (
                selection.trace.selection_reason
                if len(attempts) == 1
                else f"Failover succeeded on worker {worker.name} (id={worker.id})"
            )
            session.routing_trace = trace
            log_activity(
                db,
                event_type="task_completed",
                message=(
                    f"Session {session.id}: task '{payload.task_type}' completed "
                    f"on worker '{worker.name}'"
                ),
                agent_id=worker.id,
            )
            succeeded = True
            break
        except WorkerDispatchError as exc:
            _apply_worker_session_metrics(
                worker, succeeded=False, observed_ms=exc.elapsed_ms
            )
            last_error = str(exc)
            attempts.append(
                {
                    "agent_id": worker.id,
                    "name": worker.name,
                    "score": ranked.score,
                    "outcome": "failed",
                    "error": last_error,
                }
            )
            session.routing_trace = trace
            log_activity(
                db,
                event_type="task_failed_attempt",
                message=(
                    f"Session {session.id}: attempt on worker '{worker.name}' "
                    f"(id={worker.id}) failed — {exc}"
                ),
                agent_id=worker.id,
            )
            continue
        except Exception as exc:
            _apply_worker_session_metrics(worker, succeeded=False, observed_ms=None)
            last_error = f"Unexpected dispatch error: {exc}"
            attempts.append(
                {
                    "agent_id": worker.id,
                    "name": worker.name,
                    "score": ranked.score,
                    "outcome": "failed",
                    "error": last_error,
                }
            )
            session.routing_trace = trace
            log_activity(
                db,
                event_type="task_failed_attempt",
                message=(
                    f"Session {session.id}: unexpected failure on worker "
                    f"'{worker.name}' — {exc}"
                ),
                agent_id=worker.id,
            )
            continue

    if not succeeded:
        session.status = SESSION_FAILED
        session.error_message = (
            last_error
            or "All ranked worker attempts failed for this capability"
        )
        session.completed_at = _utcnow()
        session.updated_at = _utcnow()
        trace["selection_reason"] = "All ranked healthy workers failed during dispatch"
        session.routing_trace = trace
        log_activity(
            db,
            event_type="task_failed",
            message=(
                f"Session {session.id}: all worker attempts failed for "
                f"'{payload.capability}'"
            ),
            agent_id=payload.requester_agent_id,
        )

    db.commit()
    db.refresh(session)
    return _session_to_dispatch_response(session)


def _fail_no_worker(
    db: DbSession,
    payload: DispatchRequest,
    requester_name: str,
    selection: RoutingSelection,
) -> DispatchResponse:
    trace = selection.trace.to_dict()
    trace["selection_reason"] = (
        "No healthy active workers matched capability after routing filters"
    )
    session = Session(
        requester_agent_id=payload.requester_agent_id,
        worker_agent_id=None,
        capability=payload.capability,
        task_type=payload.task_type,
        status=SESSION_FAILED,
        input_payload=payload.input_payload,
        error_message=(
            f"No healthy worker available for capability: {payload.capability}"
        ),
        routing_trace=trace,
        completed_at=_utcnow(),
    )
    db.add(session)
    db.flush()

    log_activity(
        db,
        event_type="worker_selection_failed",
        message=(
            f"Session {session.id}: no healthy worker found for capability "
            f"'{payload.capability}'"
        ),
        agent_id=payload.requester_agent_id,
    )
    log_activity(
        db,
        event_type="task_failed",
        message=(
            f"Session {session.id}: dispatch failed because no healthy worker was "
            f"available for capability "
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
) -> tuple[dict[str, Any], float]:
    url = _worker_execute_url(worker.endpoint_url)
    body = {
        "session_id": session_id,
        "task_type": task_type,
        "capability": capability,
        "input_payload": input_payload,
    }

    try:
        start = perf_counter()
        with httpx.Client(timeout=WORKER_TIMEOUT_SECONDS) as client:
            response = client.post(url, json=body)
        elapsed_ms = (perf_counter() - start) * 1000
    except httpx.TimeoutException as exc:
        raise WorkerDispatchError("Worker request timed out", None) from exc
    except httpx.ConnectError as exc:
        raise WorkerDispatchError("Worker endpoint is unreachable", None) from exc
    except httpx.HTTPError as exc:
        raise WorkerDispatchError(f"Worker HTTP error: {exc}", None) from exc

    if response.status_code >= 400:
        raise WorkerDispatchError(
            f"Worker returned HTTP {response.status_code}: {response.text[:500]}",
            elapsed_ms,
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise WorkerDispatchError("Worker response was not valid JSON", elapsed_ms) from exc

    if not isinstance(data, dict):
        raise WorkerDispatchError("Worker response must be a JSON object", elapsed_ms)

    return data, elapsed_ms


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


class WorkerDispatchError(RuntimeError):
    def __init__(self, message: str, elapsed_ms: Optional[float]):
        super().__init__(message)
        self.elapsed_ms = elapsed_ms


def _apply_worker_session_metrics(
    worker: Agent, succeeded: bool, observed_ms: Optional[float]
) -> None:
    previous_total = worker.total_sessions
    worker.total_sessions += 1
    if succeeded:
        worker.successful_sessions += 1
    else:
        worker.failed_sessions += 1

    if observed_ms is not None:
        if worker.avg_response_time_ms is None or previous_total <= 0:
            worker.avg_response_time_ms = observed_ms
        else:
            weighted_sum = worker.avg_response_time_ms * previous_total + observed_ms
            worker.avg_response_time_ms = weighted_sum / float(previous_total + 1)
