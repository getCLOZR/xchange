"""Tests for routing transparency (preview + session routing explanations)."""

from datetime import datetime
from types import SimpleNamespace
from typing import Optional
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.services.routing_explanation_service import (
    build_routing_explanation,
    get_session_routing_explanation,
)
from app.services.routing_service import (
    _exclusion_reasons,
    _filters_applied,
    select_ranked_workers,
)


def _agent(
    agent_id: int,
    *,
    name: Optional[str] = None,
    healthy: bool = True,
    active: bool = True,
    total: int = 10,
    successful: int = 9,
    avg_ms: float = 10.0,
    cost: int = 1,
):
    return SimpleNamespace(
        id=agent_id,
        name=name or f"Worker {agent_id}",
        description="demo",
        endpoint_url=f"http://localhost:900{agent_id}",
        owner_name="Demo",
        version="0.1.0",
        cost_credits=cost,
        is_active=active,
        is_healthy=healthy,
        last_health_check=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
        avg_response_time_ms=avg_ms,
        total_sessions=total,
        successful_sessions=successful,
        failed_sessions=total - successful,
        created_at=datetime.utcnow(),
        capabilities=[],
    )


def test_exclusion_reasons():
    agent = _agent(1, active=False, healthy=False)
    reasons = _exclusion_reasons(agent, requester_agent_id=1)
    assert "inactive" in reasons
    assert "unhealthy" in reasons
    assert "exclude_requester" in reasons


def test_filters_applied_with_requester():
    assert _filters_applied(5) == [
        "active=true",
        "is_healthy=true",
        "exclude_requester",
    ]
    assert _filters_applied(None) == ["active=true", "is_healthy=true"]


def test_build_routing_explanation_includes_excluded(monkeypatch):
    workers = [
        _agent(2, healthy=False, name="Unhealthy Worker"),
        _agent(3, healthy=True, name="Healthy Worker", successful=10, total=10),
    ]
    monkeypatch.setattr(
        "app.services.routing_explanation_service.search_agents_by_capability",
        lambda db, cap: workers,
    )
    explanation = build_routing_explanation(MagicMock(), "summarization", requester_agent_id=1)
    assert explanation.candidate_count == 2
    eligible = [c for c in explanation.candidates if c.eligible]
    excluded = [c for c in explanation.candidates if not c.eligible]
    assert len(eligible) == 1
    assert len(excluded) == 1
    assert excluded[0].exclusion_message
    assert "unhealthy" in excluded[0].exclusion_reasons
    assert eligible[0].rank == 1
    assert explanation.selected_worker is not None
    assert explanation.selected_worker.agent_id == 3


def test_routing_preview_transparency(client, monkeypatch):
    workers = [
        _agent(2, cost=3, avg_ms=50.0, successful=5, total=10),
        _agent(3, cost=1, avg_ms=20.0, successful=9, total=10),
    ]
    monkeypatch.setattr(
        "app.services.routing_explanation_service.search_agents_by_capability",
        lambda db, capability_name: workers,
    )

    response = client.get(
        "/routing/preview",
        params={"capability": "summarization", "requester_agent_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filters_applied"] == [
        "active=true",
        "is_healthy=true",
        "exclude_requester",
    ]
    assert body["candidate_count"] == 2
    eligible = [c for c in body["candidates"] if c["eligible"]]
    assert len(eligible) == 2
    assert eligible[0]["score"] >= eligible[1]["score"]
    assert body["selected_worker"]["agent_id"] == eligible[0]["agent_id"]
    assert "Highest routing score" in body["selection_reason"]


def test_routing_preview_empty_candidates(client, monkeypatch):
    monkeypatch.setattr(
        "app.services.routing_explanation_service.search_agents_by_capability",
        lambda db, cap: [],
    )
    response = client.get("/routing/preview", params={"capability": "missing_cap"})
    body = response.json()
    assert body["candidate_count"] == 0
    assert body["selected_worker"] is None
    assert "No healthy active" in body["selection_reason"]


def test_select_ranked_workers_trace_serialization(monkeypatch):
    workers = [
        _agent(2, healthy=False),
        _agent(3, healthy=True),
    ]
    monkeypatch.setattr(
        "app.services.routing_service.search_agents_by_capability",
        lambda db, cap: workers,
    )
    selection = select_ranked_workers(MagicMock(), "summarization", requester_agent_id=1)
    trace = selection.trace.to_dict()
    assert trace["candidate_count"] == 2
    assert len(trace["candidates"]) == 1
    assert len(trace["excluded_candidates"]) == 1
    assert trace["excluded_candidates"][0]["eligible"] is False


def test_session_routing_endpoint(client, monkeypatch):
    session = SimpleNamespace(
        id=7,
        capability="summarization",
        requester_agent_id=1,
        worker_agent_id=3,
        routing_trace={
            "capability": "summarization",
            "filters": ["active=true", "is_healthy=true", "exclude_requester"],
            "candidates": [
                {
                    "agent_id": 3,
                    "agent_name": "Healthy Worker",
                    "name": "Healthy Worker",
                    "is_active": True,
                    "is_healthy": True,
                    "success_rate": 0.9,
                    "avg_response_time_ms": 10.0,
                    "cost_credits": 1,
                    "score": 0.85,
                    "score_breakdown": {"final_score": 0.85},
                    "eligible": True,
                }
            ],
            "excluded_candidates": [
                {
                    "agent_id": 2,
                    "agent_name": "Unhealthy Worker",
                    "exclusion_reasons": ["unhealthy"],
                    "exclusion_message": "Excluded: unhealthy",
                    "eligible": False,
                }
            ],
            "candidate_count": 2,
            "selected_agent_id": 3,
            "selection_reason": "Highest routing score among healthy active candidates",
            "attempts": [{"agent_id": 3, "name": "Healthy Worker", "outcome": "succeeded"}],
        },
    )
    monkeypatch.setattr(
        "app.api.routes.sessions.session_service.get_session_by_id",
        lambda db, sid: session if sid == 7 else None,
    )

    response = client.get("/sessions/7/routing")
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == 7
    assert body["selected_worker"]["agent_id"] == 3
    assert body["candidate_count"] == 2
    assert len(body["dispatch_attempts"]) == 1


def test_get_session_routing_from_legacy_trace():
    session = SimpleNamespace(
        id=5,
        capability="web_search",
        requester_agent_id=2,
        worker_agent_id=4,
        routing_trace={
            "capability": "web_search",
            "filters": ["active=true", "is_healthy=true"],
            "candidates": [
                {
                    "agent_id": 4,
                    "name": "Search Agent",
                    "score": 0.9,
                    "success_rate": 1.0,
                    "is_healthy": True,
                    "cost_credits": 2,
                }
            ],
            "selected_agent_id": 4,
            "selection_reason": "Highest routing score among healthy active candidates",
        },
    )
    result = get_session_routing_explanation(MagicMock(), session)
    assert result.session_id == 5
    assert result.selected_worker is not None
    assert result.selected_worker.agent_id == 4
