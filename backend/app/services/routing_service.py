"""Deterministic worker routing for CLOZR Exchange."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.orm import Session as DbSession

from app.models.agent import Agent
from app.schemas.routing import RoutingCandidateScore, RoutingPreviewResponse, RoutingTrace
from app.services.agent_service import search_agents_by_capability

# Scoring weights (must sum to 1.0)
WEIGHT_SUCCESS_RATE = 0.50
WEIGHT_LATENCY = 0.25
WEIGHT_COST = 0.15
WEIGHT_HEALTH = 0.10

LATENCY_NORMALIZATION_CAP_MS = 5000.0
DEFAULT_FILTERS = ["active=true", "is_healthy=true", "exclude_requester"]


@dataclass
class RankedWorker:
    agent: Agent
    score: float
    success_rate: float
    score_breakdown: dict[str, float]


@dataclass
class RoutingSelection:
    selected: Optional[RankedWorker]
    ranked: list[RankedWorker]
    trace: RoutingTrace


def preview_routing(
    db: DbSession,
    capability: str,
    requester_agent_id: Optional[int] = None,
) -> RoutingPreviewResponse:
    """Return ranked candidates and selected worker preview (no session)."""
    from app.services.routing_explanation_service import build_routing_explanation

    explanation = build_routing_explanation(
        db, capability=capability, requester_agent_id=requester_agent_id
    )
    return RoutingPreviewResponse(
        capability=explanation.capability,
        filters_applied=explanation.filters_applied,
        candidate_count=explanation.candidate_count,
        candidates=explanation.candidates,
        selected_worker=explanation.selected_worker,
        selection_reason=explanation.selection_reason,
        filters=explanation.filters,
        selected_agent_id=explanation.selected_agent_id,
        routing_trace=explanation.routing_trace,
        # Legacy ranked list shape for older clients
        legacy_candidates=_legacy_candidates(explanation.candidates),
    )


def select_ranked_workers(
    db: DbSession,
    capability: str,
    requester_agent_id: Optional[int] = None,
) -> RoutingSelection:
    """Find, score, rank, and select the best healthy active worker."""
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

    from app.services.routing_explanation_service import (
        _eligible_trace_entry,
        _excluded_trace_entry,
    )

    trace = RoutingTrace(
        capability=capability,
        filters=filters_applied,
        candidates=[_eligible_trace_entry(r) for r in ranked],
        excluded_candidates=[
            _excluded_trace_entry(agent, reasons) for agent, reasons in excluded
        ],
        candidate_count=len(ranked) + len(excluded),
    )

    if not ranked:
        trace.selection_reason = (
            "No healthy active workers matched capability after filters"
        )
        return RoutingSelection(selected=None, ranked=[], trace=trace)

    best = ranked[0]
    trace.selected_agent_id = best.agent.id
    trace.selection_reason = (
        "Highest routing score among healthy active candidates"
    )
    return RoutingSelection(selected=best, ranked=ranked, trace=trace)


def calculate_routing_score(
    agent: Agent,
    *,
    pool_latencies_ms: Optional[list[float]] = None,
    pool_costs: Optional[list[int]] = None,
) -> tuple[float, float, dict[str, float]]:
    """Return (final_score, success_rate, breakdown) for one worker."""
    success_rate = _success_rate(agent)
    success_rate_score = success_rate if agent.total_sessions > 0 else 0.5

    latency_score = _latency_score(agent.avg_response_time_ms, pool_latencies_ms)
    cost_score = _cost_score(agent.cost_credits, pool_costs)
    health_score = 1.0 if agent.is_healthy else 0.0

    final = (
        success_rate_score * WEIGHT_SUCCESS_RATE
        + latency_score * WEIGHT_LATENCY
        + cost_score * WEIGHT_COST
        + health_score * WEIGHT_HEALTH
    )
    breakdown = {
        "success_rate_score": round(success_rate_score, 4),
        "latency_score": round(latency_score, 4),
        "cost_score": round(cost_score, 4),
        "health_score": round(health_score, 4),
        "final_score": round(final, 4),
    }
    return round(final, 4), success_rate, breakdown


def _exclusion_reasons(
    agent: Agent, requester_agent_id: Optional[int]
) -> list[str]:
    reasons: list[str] = []
    if not agent.is_active:
        reasons.append("inactive")
    if not agent.is_healthy:
        reasons.append("unhealthy")
    if requester_agent_id is not None and agent.id == requester_agent_id:
        reasons.append("exclude_requester")
    return reasons


def _filters_applied(requester_agent_id: Optional[int]) -> list[str]:
    filters = ["active=true", "is_healthy=true"]
    if requester_agent_id is not None:
        filters.append("exclude_requester")
    return filters


def _rank_workers(candidates: list[Agent]) -> list[RankedWorker]:
    if not candidates:
        return []

    pool_latencies = [
        a.avg_response_time_ms
        for a in candidates
        if a.avg_response_time_ms is not None
    ]
    pool_costs = [a.cost_credits for a in candidates]

    ranked: list[RankedWorker] = []
    for agent in candidates:
        score, success_rate, breakdown = calculate_routing_score(
            agent,
            pool_latencies_ms=pool_latencies or None,
            pool_costs=pool_costs,
        )
        ranked.append(
            RankedWorker(
                agent=agent,
                score=score,
                success_rate=success_rate,
                score_breakdown=breakdown,
            )
        )

    ranked.sort(
        key=lambda r: (
            -r.score,
            -r.success_rate,
            r.agent.avg_response_time_ms
            if r.agent.avg_response_time_ms is not None
            else float("inf"),
            r.agent.cost_credits,
            r.agent.id,
        )
    )
    return ranked


def _success_rate(agent: Agent) -> float:
    if agent.total_sessions <= 0:
        return 0.0
    return agent.successful_sessions / float(agent.total_sessions)


def _latency_score(
    avg_ms: Optional[float],
    pool_latencies_ms: Optional[list[float]],
) -> float:
    if avg_ms is None:
        return 0.5
    if pool_latencies_ms:
        min_l = min(pool_latencies_ms)
        max_l = max(pool_latencies_ms)
        if min_l == max_l:
            return 1.0
        return 1.0 - (avg_ms - min_l) / (max_l - min_l)
    return max(0.0, min(1.0, 1.0 - (avg_ms / LATENCY_NORMALIZATION_CAP_MS)))


def _cost_score(cost_credits: Optional[int], pool_costs: Optional[list[int]]) -> float:
    if cost_credits is None:
        return 0.5
    if pool_costs and len(pool_costs) > 1:
        min_c = min(pool_costs)
        max_c = max(pool_costs)
        if min_c == max_c:
            return 1.0 if cost_credits == 0 else 1.0 / (1.0 + cost_credits)
        return 1.0 - (cost_credits - min_c) / (max_c - min_c)
    return 1.0 if cost_credits == 0 else 1.0 / (1.0 + cost_credits)


def _ranked_to_candidate_score(ranked: RankedWorker) -> RoutingCandidateScore:
    agent = ranked.agent
    return RoutingCandidateScore(
        agent_id=agent.id,
        name=agent.name,
        success_rate=round(ranked.success_rate, 4),
        avg_response_time_ms=agent.avg_response_time_ms,
        cost_credits=agent.cost_credits,
        is_healthy=agent.is_healthy,
        score=ranked.score,
        score_breakdown=ranked.score_breakdown,
    )


def _legacy_candidates(candidates: list) -> list[RoutingCandidateScore]:
    """Map explained candidates to legacy preview candidate shape."""
    legacy: list[RoutingCandidateScore] = []
    for c in candidates:
        if not c.eligible or c.score is None:
            continue
        legacy.append(
            RoutingCandidateScore(
                agent_id=c.agent_id,
                name=c.agent_name,
                success_rate=c.success_rate,
                avg_response_time_ms=c.avg_response_time_ms,
                cost_credits=c.cost_credits,
                is_healthy=c.is_healthy,
                score=c.score,
                score_breakdown=c.score_breakdown or {},
            )
        )
    return legacy


def _no_selection_reason(selection: RoutingSelection) -> str:
    if not selection.ranked:
        return "No eligible workers after routing filters"
    return "No worker selected"
