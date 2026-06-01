from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.services import session_service
from app.services.contract_validation_service import (
    ExecuteParseError,
    ExecuteParseInvalid,
    ExecuteParseSuccess,
    parse_execute_response,
    validate_health_response,
)
from app.services.routing_service import RankedWorker, RoutingSelection, RoutingTrace
from app.services.session_service import WorkerDispatchError
from app.schemas.session import DispatchRequest
from demo_agents.summarizer_worker_common import create_summarizer_app


@pytest.fixture
def demo_worker_client() -> TestClient:
    app = create_summarizer_app(agent_name="Demo Summarizer Agent", agent_version="1.0.0")
    return TestClient(app)


def test_demo_worker_health_follows_contract(demo_worker_client):
    response = demo_worker_client.get("/health")
    assert response.status_code == 200
    body = response.json()
    parsed, error = validate_health_response(body)
    assert error is None
    assert parsed is not None
    assert parsed.status == "ok"
    assert parsed.agent_name == "Demo Summarizer Agent"
    assert parsed.version == "1.0.0"


def test_demo_worker_execute_success_follows_contract(demo_worker_client):
    response = demo_worker_client.post(
        "/execute",
        json={
            "session_id": 42,
            "capability": "summarization",
            "task_type": "summarize_text",
            "input_payload": {"text": "hello world"},
        },
    )
    assert response.status_code == 200
    body = response.json()
    parsed = parse_execute_response(body)
    assert isinstance(parsed, ExecuteParseSuccess)
    assert parsed.output_payload["summary"].startswith("[Demo Summarizer Agent]")
    assert parsed.execution_time_ms >= 0


def test_demo_worker_execute_error_follows_contract(demo_worker_client):
    response = demo_worker_client.post(
        "/execute",
        json={
            "session_id": 7,
            "capability": "summarization",
            "task_type": "summarize_text",
            "input_payload": {},
        },
    )
    assert response.status_code == 200
    body = response.json()
    parsed = parse_execute_response(body)
    assert isinstance(parsed, ExecuteParseError)
    assert parsed.error_code == "INVALID_INPUT"
    assert "text" in parsed.message.lower()


def test_parse_execute_rejects_invalid_shape():
    parsed = parse_execute_response({"foo": "bar"})
    assert isinstance(parsed, ExecuteParseInvalid)


def test_dispatch_accepts_valid_success_response(monkeypatch):
    def _success(**kwargs):
        return ({"summary": "done"}, 25.0)

    monkeypatch.setattr(session_service, "_call_worker_execute", _success)
    result = _run_dispatch(monkeypatch)
    assert result.status == "completed"
    assert result.output_payload == {"summary": "done"}


def test_dispatch_handles_valid_worker_error_response(monkeypatch):
    def _worker_error(**kwargs):
        raise WorkerDispatchError("INVALID_INPUT: missing text", 10.0, "INVALID_INPUT")

    monkeypatch.setattr(session_service, "_call_worker_execute", _worker_error)
    result = _run_dispatch(monkeypatch, ranked_count=1)
    assert result.status == "failed"
    assert "INVALID_INPUT" in (result.error_message or "")


def test_dispatch_rejects_invalid_worker_response(monkeypatch):
    def _invalid(**kwargs):
        raise WorkerDispatchError(
            "Execute response missing required field: status",
            5.0,
            error_code="INVALID_WORKER_RESPONSE",
        )

    monkeypatch.setattr(session_service, "_call_worker_execute", _invalid)
    result = _run_dispatch(monkeypatch, ranked_count=1)
    assert result.status == "failed"


def test_dispatch_failover_on_invalid_then_success(monkeypatch):
    calls = {"n": 0}

    def _call(**kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise WorkerDispatchError(
                "Invalid success response: validation failed",
                3.0,
                error_code="INVALID_WORKER_RESPONSE",
            )
        return ({"summary": "recovered"}, 8.0)

    monkeypatch.setattr(session_service, "_call_worker_execute", _call)
    result = _run_dispatch(monkeypatch, ranked_count=2)
    assert result.status == "completed"
    assert calls["n"] == 2


def test_call_worker_execute_parses_contract_success():
    worker = SimpleNamespace(endpoint_url="http://localhost:9001")

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "status": "success",
                "session_id": 1,
                "agent_name": "Demo",
                "capability": "summarization",
                "task_type": "summarize_text",
                "output_payload": {"summary": "ok"},
                "execution_time_ms": 12.5,
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def post(self, url, json):
            return FakeResponse()

    import httpx

    original = httpx.Client
    try:
        httpx.Client = FakeClient
        output, ms = session_service._call_worker_execute(
            worker=worker,
            session_id=1,
            task_type="summarize_text",
            capability="summarization",
            input_payload={"text": "hi"},
        )
    finally:
        httpx.Client = original

    assert output == {"summary": "ok"}
    assert ms == 12.5


class _FakeSession:
    def __init__(self, **kwargs):
        self.id = 50
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


def _run_dispatch(monkeypatch, ranked_count: int = 1):
    ranked = [
        RankedWorker(
            agent=SimpleNamespace(
                id=i + 2,
                name=f"Worker {i + 2}",
                endpoint_url=f"http://localhost:900{i + 1}",
            ),
            score=0.9 - i * 0.1,
            success_rate=1.0,
            score_breakdown={},
        )
        for i in range(ranked_count)
    ]
    db = MagicMock()
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    monkeypatch.setattr(
        session_service,
        "get_agent_by_id",
        lambda db, agent_id: SimpleNamespace(id=1, name="Requester"),
    )
    monkeypatch.setattr(
        session_service,
        "select_ranked_workers",
        lambda db, capability, requester_agent_id: RoutingSelection(
            selected=ranked[0],
            ranked=ranked,
            trace=RoutingTrace(capability="summarization"),
        ),
    )
    monkeypatch.setattr(session_service, "Session", _FakeSession)
    monkeypatch.setattr(session_service, "log_activity", lambda *a, **k: None)
    monkeypatch.setattr(session_service, "_apply_worker_session_metrics", lambda *a, **k: None)

    return session_service.dispatch_task(
        db,
        DispatchRequest(
            requester_agent_id=1,
            capability="summarization",
            task_type="summarize_text",
            input_payload={"text": "hello"},
        ),
    )
