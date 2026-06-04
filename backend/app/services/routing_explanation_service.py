"""Build human-readable routing explanations without changing selection logic."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session as DbSession

from app.models.agent import Agent
from app.models.session import Session
from app.schemas.routing import RoutingTrace
from app.schemas.routing_explanation import (
    RoutingExplainedCandidate,
    RoutingExplanationResponse,
    RoutingWorkerRef,
    SessionRoutingResponse,
)
from app.services.agent_service import search_agents_by_capability
from app.services.routing_service import (
    DEFAULT_FILTERS,
    RankedWorker,
    _exclusion_reasons,
    _filters_applied,
    _rank_workers,
    _success_rate,
    calculate_routing_score,
)

EXCLUSION_LABELS = {
    "inactive": "Excluded: inactive (active=false)",
    "unhealthy": "Excluded: unhealthy",
    "exclude_requester": "Excluded: requester excluded from worker pool",
}


def build_routing_explanation(
    db: DbSession,
    capability: str,
    requester_agent_id: Optional[int] = None,
) -> RoutingExplanationResponse:
    """Explain routing for a capability using the same filter/rank logic as dispatch."""
    raw_workers = search_agents_by_capability(db, capability)
    filters_applied = _filters_applied(requester_agent_id)

    eligible_agents: list[Agent] = []
    excluded: list[tuple[Agent, list[str]]] = []

    for agent in raw_workers:
        reasons = _exclusion_reasons(agent, requester_agent_id)
        if reasons:
            excluded.append((agent, reasons))
        else:
            eligible_agents.append(agent)

    ranked = _rank_workers(eligible_agents)
    candidates = _candidates_from_ranked_and_excluded(ranked, excluded)

    selected: Optional[RankedWorker] = ranked[0] if ranked else None
    if selected:
        selection_reason = "Highest routing score among healthy active candidates"
        selected_worker = RoutingWorkerRef(
            agent_id=selected.agent.id,
            agent_name=selected.agent.name,
        )
        selected_agent_id = selected.agent.id
    else:
        selection_reason = "No healthy active workers matched capability after filters"
        selected_worker = None
        selected_agent_id = None

    trace = RoutingTrace(
        capability=capability,
        filters=filters_applied,
        candidates=[_eligible_trace_entry(r) for r in ranked],
        excluded_candidates=[_excluded_trace_entry(agent, reasons) for agent, reasons in excluded],
        candidate_count=len(candidates),
        selected_agent_id=selected_agent_id,
        selection_reason=selection_reason,
    )

    return RoutingExplanationResponse(
        capability=capability,
        filters_applied=filters_applied,
        candidate_count=len(candidates),
        candidates=candidates,
        selected_worker=selected_worker,
        selection_reason=selection_reason,
        filters=filters_applied,
        selected_agent_id=selected_agent_id,
        routing_trace=trace.to_dict(),
    )


def get_session_routing_explanation(
    db: DbSession, session: Session
) -> SessionRoutingResponse:
    """Return routing explanation for a completed or in-flight session."""
    trace = session.routing_trace or {}
    requester_id = session.requester_agent_id

    if trace.get("excluded_candidates") is not None or trace.get("candidate_count") is not None:
        return _explanation_from_stored_trace(session, trace)

    # Legacy traces: rebuild from stored eligible candidates + live exclusions
    if trace.get("candidates"):
        return _explanation_from_legacy_trace(session, trace)

    # No trace: explain using current registry state (same capability/requester)
    live = build_routing_explanation(
        db, session.capability, requester_agent_id=requester_id
    )
    return _attach_session_context(session, live, trace.get("attempts") or [])


def _explanation_from_stored_trace(
    session: Session, trace: dict[str, Any]
) -> SessionRoutingResponse:
    filters_applied = list(trace.get("filters") or trace.get("filters_applied") or DEFAULT_FILTERS)
    candidates: list[RoutingExplainedCandidate] = []
    rank = 1

    for entry in trace.get("candidates") or []:
        candidates.append(_candidate_from_trace_entry(entry, eligible=True, rank=rank))
        rank += 1

    for entry in trace.get("excluded_candidates") or []:
        candidates.append(_candidate_from_trace_entry(entry, eligible=False, rank=None))

    selected_worker = _resolve_selected_worker(session, trace)
    selection_reason = (
        trace.get("selection_reason")
        or "No routing selection recorded for this session"
    )

    return SessionRoutingResponse(
        session_id=session.id,
        capability=session.capability,
        filters_applied=filters_applied,
        candidate_count=trace.get("candidate_count") or len(candidates),
        candidates=candidates,
        selected_worker=selected_worker,
        selection_reason=selection_reason,
        filters=filters_applied,
        selected_agent_id=selected_worker.agent_id if selected_worker else None,
        routing_trace=trace,
        dispatch_attempts=list(trace.get("attempts") or []),
    )


def _explanation_from_legacy_trace(
    session: Session, trace: dict[str, Any]
) -> SessionRoutingResponse:
    filters_applied = list(trace.get("filters") or DEFAULT_FILTERS)
    candidates: list[RoutingExplainedCandidate] = []
    rank = 1
    for entry in trace.get("candidates") or []:
        candidates.append(_candidate_from_trace_entry(entry, eligible=True, rank=rank))
        rank += 1

    selected_worker = _resolve_selected_worker(session, trace)
    return SessionRoutingResponse(
        session_id=session.id,
        capability=session.capability,
        filters_applied=filters_applied,
        candidate_count=len(candidates),
        candidates=candidates,
        selected_worker=selected_worker,
        selection_reason=trace.get("selection_reason") or "",
        filters=filters_applied,
        selected_agent_id=selected_worker.agent_id if selected_worker else None,
        routing_trace=trace,
        dispatch_attempts=list(trace.get("attempts") or []),
    )


def _attach_session_context(
    session: Session,
    live: RoutingExplanationResponse,
    attempts: list[dict[str, Any]],
) -> SessionRoutingResponse:
    selected_worker = _resolve_selected_worker(session, live.routing_trace)
    if selected_worker:
        selection_reason = live.selection_reason
        if attempts and attempts[-1].get("outcome") == "succeeded":
            last = attempts[-1]
            if last.get("agent_id") != live.selected_agent_id:
                selection_reason = (
                    f"Failover succeeded on worker {last.get('name', last.get('agent_id'))}"
                )
    else:
        selection_reason = live.selection_reason

    return SessionRoutingResponse(
        session_id=session.id,
        dispatch_attempts=attempts,
        selected_worker=selected_worker,
        selection_reason=selection_reason,
        selected_agent_id=selected_worker.agent_id if selected_worker else None,
        **live.model_dump(exclude={"selected_worker", "selection_reason", "selected_agent_id"}),
    )


def _resolve_selected_worker(
    session: Session, trace: dict[str, Any]
) -> Optional[RoutingWorkerRef]:
    worker_id = session.worker_agent_id or trace.get("selected_agent_id")
    if worker_id is None:
        return None
    name = _agent_name_from_trace(trace, worker_id)
    if name is None and session.worker_agent_id:
        for attempt in trace.get("attempts") or []:
            if attempt.get("agent_id") == worker_id and attempt.get("name"):
                name = attempt["name"]
                break
    return RoutingWorkerRef(
        agent_id=worker_id,
        agent_name=name or f"Agent {worker_id}",
    )


def _agent_name_from_trace(trace: dict[str, Any], agent_id: int) -> Optional[str]:
    for entry in trace.get("candidates") or []:
        if entry.get("agent_id") == agent_id:
            return entry.get("name") or entry.get("agent_name")
    for entry in trace.get("excluded_candidates") or []:
        if entry.get("agent_id") == agent_id:
            return entry.get("name") or entry.get("agent_name")
    for attempt in trace.get("attempts") or []:
        if attempt.get("agent_id") == agent_id:
            return attempt.get("name")
    return None


def _candidates_from_ranked_and_excluded(
    ranked: list[RankedWorker],
    excluded: list[tuple[Agent, list[str]]],
) -> list[RoutingExplainedCandidate]:
    candidates: list[RoutingExplainedCandidate] = []
    for index, ranked_worker in enumerate(ranked, start=1):
        candidates.append(_eligible_candidate(ranked_worker, rank=index))
    for agent, reasons in excluded:
        candidates.append(_excluded_candidate(agent, reasons))
    return candidates


def _eligible_candidate(ranked: RankedWorker, rank: int) -> RoutingExplainedCandidate:
    agent = ranked.agent
    return RoutingExplainedCandidate(
        agent_id=agent.id,
        agent_name=agent.name,
        is_active=agent.is_active,
        is_healthy=agent.is_healthy,
        success_rate=round(ranked.success_rate, 4),
        avg_response_time_ms=agent.avg_response_time_ms,
        cost_credits=agent.cost_credits,
        score=ranked.score,
        score_breakdown=ranked.score_breakdown,
        eligible=True,
        rank=rank,
    )


def _excluded_candidate(agent: Agent, reasons: list[str]) -> RoutingExplainedCandidate:
    success_rate = _success_rate(agent)
    pool_latencies = (
        [agent.avg_response_time_ms]
        if agent.avg_response_time_ms is not None
        else None
    )
    score, _, breakdown = calculate_routing_score(
        agent, pool_latencies_ms=pool_latencies, pool_costs=[agent.cost_credits]
    )
    messages = [EXCLUSION_LABELS.get(r, r) for r in reasons]
    return RoutingExplainedCandidate(
        agent_id=agent.id,
        agent_name=agent.name,
        is_active=agent.is_active,
        is_healthy=agent.is_healthy,
        success_rate=round(success_rate, 4),
        avg_response_time_ms=agent.avg_response_time_ms,
        cost_credits=agent.cost_credits,
        score=score,
        score_breakdown=breakdown,
        eligible=False,
        rank=None,
        exclusion_reasons=reasons,
        exclusion_message="; ".join(messages),
    )


def _candidate_from_trace_entry(
    entry: dict[str, Any],
    *,
    eligible: bool,
    rank: Optional[int],
) -> RoutingExplainedCandidate:
    reasons = list(entry.get("exclusion_reasons") or [])
    return RoutingExplainedCandidate(
        agent_id=entry["agent_id"],
        agent_name=entry.get("agent_name") or entry.get("name") or f"Agent {entry['agent_id']}",
        is_active=entry.get("is_active", True),
        is_healthy=entry.get("is_healthy", eligible),
        success_rate=float(entry.get("success_rate", 0.0)),
        avg_response_time_ms=entry.get("avg_response_time_ms"),
        cost_credits=int(entry.get("cost_credits", 0)),
        score=entry.get("score"),
        score_breakdown=entry.get("score_breakdown"),
        eligible=eligible,
        rank=rank if eligible else None,
        exclusion_reasons=reasons,
        exclusion_message=entry.get("exclusion_message")
        or (
            "; ".join(EXCLUSION_LABELS.get(r, r) for r in reasons) if reasons else None
        ),
    )


def _eligible_trace_entry(ranked: RankedWorker) -> dict[str, Any]:
    agent = ranked.agent
    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "name": agent.name,
        "is_active": agent.is_active,
        "is_healthy": agent.is_healthy,
        "success_rate": round(ranked.success_rate, 4),
        "avg_response_time_ms": agent.avg_response_time_ms,
        "cost_credits": agent.cost_credits,
        "score": ranked.score,
        "score_breakdown": ranked.score_breakdown,
        "eligible": True,
    }


def _excluded_trace_entry(agent: Agent, reasons: list[str]) -> dict[str, Any]:
    success_rate = _success_rate(agent)
    score, _, breakdown = calculate_routing_score(
        agent, pool_latencies_ms=None, pool_costs=[agent.cost_credits]
    )
    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "name": agent.name,
        "is_active": agent.is_active,
        "is_healthy": agent.is_healthy,
        "success_rate": round(success_rate, 4),
        "avg_response_time_ms": agent.avg_response_time_ms,
        "cost_credits": agent.cost_credits,
        "score": score,
        "score_breakdown": breakdown,
        "eligible": False,
        "exclusion_reasons": reasons,
        "exclusion_message": "; ".join(EXCLUSION_LABELS.get(r, r) for r in reasons),
    }

