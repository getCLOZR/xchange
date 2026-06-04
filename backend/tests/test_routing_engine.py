from datetime import datetime
from types import SimpleNamespace
from typing import Optional
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services import routing_service, session_service
from app.services.routing_service import (
    RankedWorker,
    _rank_workers,
    calculate_routing_score,
    select_ranked_workers,
)
from app.services.session_service import WorkerDispatchError


def _agent(
    agent_id: int,
    *,
    name: Optional[str] = None,
    cost: int = 1,
    avg_ms: Optional[float] = 10.0,
    total: int = 10,
    successful: int = 9,
    healthy: bool = True,
    active: bool = True,
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


def test_routing_score_calculation():
    agent = _agent(1, total=10, successful=8, avg_ms=100.0, cost=2)
    score, rate, breakdown = calculate_routing_score(agent)
    assert rate == 0.8
    assert breakdown["success_rate_score"] == 0.8
    assert 0.0 <= breakdown["latency_score"] <= 1.0
    assert 0.0 <= breakdown["cost_score"] <= 1.0
    assert breakdown["health_score"] == 1.0
    assert score == pytest.approx(breakdown["final_score"], rel=1e-4)
    expected = (
        0.8 * 0.50
        + breakdown["latency_score"] * 0.25
        + breakdown["cost_score"] * 0.15
        + 1.0 * 0.10
    )
    assert score == pytest.approx(expected, rel=1e-4)

    neutral_agent = _agent(2, total=0, successful=0, avg_ms=None, cost=0)
    neutral_score, _, neutral_breakdown = calculate_routing_score(neutral_agent)
    assert neutral_breakdown["success_rate_score"] == 0.5
    assert neutral_breakdown["latency_score"] == 0.5
    assert neutral_score > 0


def test_routing_preview_returns_ranked_candidates(client, monkeypatch):
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
    assert body["capability"] == "summarization"
    eligible = [c for c in body["candidates"] if c.get("eligible", True)]
    assert len(eligible) == 2
    assert eligible[0]["score"] >= eligible[1]["score"]
    assert body["selected_agent_id"] == eligible[0]["agent_id"]


def test_dispatch_selects_highest_scoring_healthy_worker():
    weaker = _agent(2, successful=5, total=10, avg_ms=200.0, cost=5)
    stronger = _agent(3, successful=10, total=10, avg_ms=20.0, cost=1)
    ranked = _rank_workers([weaker, stronger])
    assert ranked[0].agent.id == 3
    assert ranked[0].score >= ranked[1].score


def test_select_ranked_workers_skips_unhealthy(monkeypatch):
    workers = [
        _agent(2, healthy=False),
        _agent(3, healthy=True, successful=10, total=10),
    ]
    monkeypatch.setattr(
        routing_service,
        "search_agents_by_capability",
        lambda db, cap: workers,
    )
    selection = select_ranked_workers(MagicMock(), "summarization", requester_agent_id=1)
    assert len(selection.ranked) == 1
    assert selection.ranked[0].agent.id == 3


class _FakeSession:
    def __init__(self, **kwargs):
        self.id = 99
        self.status = "pending"
        self.worker_agent_id = None
        self.capability = kwargs.get("capability", "summarization")
        self.task_type = kwargs.get("task_type", "summarize_text")
        self.input_payload = kwargs.get("input_payload", {})
        self.output_payload = None
        self.error_message = None
        self.routing_trace = kwargs.get("routing_trace") or {}
        self.started_at = None
        self.completed_at = None
        self.updated_at = None
        self.requester_agent_id = kwargs.get("requester_agent_id", 1)


def test_dispatch_failover_second_worker_succeeds(monkeypatch):
    ranked = [
        RankedWorker(
            agent=_agent(2),
            score=0.9,
            success_rate=1.0,
            score_breakdown={},
        ),
        RankedWorker(
            agent=_agent(3),
            score=0.8,
            success_rate=1.0,
            score_breakdown={},
        ),
    ]
    calls = {"n": 0}

    def _call_worker(**kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise WorkerDispatchError("forced failure", 5.0)
        return ({"result": "recovered"}, 8.0)

    monkeypatch.setattr(session_service, "_call_worker_execute", _call_worker)

    db = MagicMock()
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    monkeypatch.setattr(
        session_service,
        "get_agent_by_id",
        lambda db, agent_id: _agent(1),
    )
    monkeypatch.setattr(
        session_service,
        "select_ranked_workers",
        lambda db, capability, requester_agent_id: routing_service.RoutingSelection(
            selected=ranked[0],
            ranked=ranked,
            trace=routing_service.RoutingTrace(capability="summarization"),
        ),
    )
    monkeypatch.setattr(session_service, "Session", _FakeSession)
    monkeypatch.setattr(session_service, "log_activity", lambda *a, **k: None)
    monkeypatch.setattr(session_service, "_apply_worker_session_metrics", lambda *a, **k: None)

    from app.schemas.session import DispatchRequest

    result = session_service.dispatch_task(
        db,
        DispatchRequest(
            requester_agent_id=1,
            capability="summarization",
            task_type="summarize_text",
            input_payload={},
        ),
    )

    assert result.status == "completed"
    assert calls["n"] == 2
    assert len(result.routing_trace["attempts"]) == 2
    assert result.routing_trace["attempts"][0]["outcome"] == "failed"
    assert result.routing_trace["attempts"][1]["outcome"] == "succeeded"


def test_dispatch_fails_when_all_candidates_fail(monkeypatch):
    ranked = [
        RankedWorker(
            agent=_agent(2),
            score=0.9,
            success_rate=1.0,
            score_breakdown={},
        ),
    ]

    def _always_fail(**kwargs):
        raise WorkerDispatchError("all fail", None)

    monkeypatch.setattr(session_service, "_call_worker_execute", _always_fail)

    db = MagicMock()
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    monkeypatch.setattr(
        session_service,
        "get_agent_by_id",
        lambda db, agent_id: _agent(1),
    )
    monkeypatch.setattr(
        session_service,
        "select_ranked_workers",
        lambda db, capability, requester_agent_id: routing_service.RoutingSelection(
            selected=ranked[0],
            ranked=ranked,
            trace=routing_service.RoutingTrace(capability="summarization"),
        ),
    )
    monkeypatch.setattr(session_service, "Session", _FakeSession)
    monkeypatch.setattr(session_service, "log_activity", lambda *a, **k: None)
    monkeypatch.setattr(session_service, "_apply_worker_session_metrics", lambda *a, **k: None)

    from app.schemas.session import DispatchRequest

    result = session_service.dispatch_task(
        db,
        DispatchRequest(
            requester_agent_id=1,
            capability="summarization",
            task_type="summarize_text",
            input_payload={},
        ),
    )

    assert result.status == "failed"
    assert result.routing_trace["attempts"][0]["outcome"] == "failed"


def test_routing_preview_endpoint(client, monkeypatch):
    workers = [_agent(2, healthy=True), _agent(3, healthy=True, cost=0)]
    monkeypatch.setattr(
        "app.services.routing_explanation_service.search_agents_by_capability",
        lambda db, capability_name: workers,
    )

    response = client.get(
        "/routing/preview",
        params={"capability": "summarization"},
    )
    assert response.status_code == 200
    assert response.json()["selected_agent_id"] is not None


def test_dispatch_no_healthy_workers(client, monkeypatch):
    def _raise_no_worker(db, payload):
        raise HTTPException(
            status_code=404,
            detail={
                "message": "No healthy worker available for capability: summarization",
                "session": {"status": "failed"},
            },
        )

    monkeypatch.setattr(session_service, "dispatch_task", _raise_no_worker)

    response = client.post(
        "/sessions/dispatch",
        json={
            "requester_agent_id": 1,
            "capability": "summarization",
            "task_type": "summarize_text",
            "input_payload": {"text": "hello"},
        },
    )
    assert response.status_code == 404
