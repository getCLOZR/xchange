"""External agent validation — contract-only workers, no CLOZR backend imports."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.services import session_service
from app.services.contract_validation_service import (
    ExecuteParseSuccess,
    parse_execute_response,
    validate_health_response,
)
from app.services.routing_service import RankedWorker, RoutingSelection, RoutingTrace
from app.schemas.session import DispatchRequest
from external_agents.translator_agent.main import app as translator_app
from external_agents.weather_agent.main import app as weather_app


@pytest.fixture
def weather_client() -> TestClient:
    return TestClient(weather_app)


@pytest.fixture
def translator_client() -> TestClient:
    return TestClient(translator_app)


def test_weather_agent_health_contract(weather_client):
    response = weather_client.get("/health")
    assert response.status_code == 200
    parsed, error = validate_health_response(response.json())
    assert error is None
    assert parsed.agent_name == "External Weather Agent"
    assert parsed.status == "ok"


def test_weather_agent_execute_contract(weather_client):
    response = weather_client.post(
        "/execute",
        json={
            "session_id": 11,
            "capability": "weather_lookup",
            "task_type": "get_weather",
            "input_payload": {"location": "Chicago"},
        },
    )
    assert response.status_code == 200
    body = response.json()
    parsed = parse_execute_response(body)
    assert isinstance(parsed, ExecuteParseSuccess)
    assert body["output_payload"]["location"] == "Chicago"
    assert "temperature_f" in body["output_payload"]
    assert body["output_payload"]["source"] == "external-weather-agent-v1"
    # Deterministic for same location
    response2 = weather_client.post(
        "/execute",
        json={
            "session_id": 12,
            "capability": "weather_lookup",
            "task_type": "get_weather",
            "input_payload": {"location": "Chicago"},
        },
    )
    assert (
        response2.json()["output_payload"]["temperature_f"]
        == body["output_payload"]["temperature_f"]
    )


def test_translator_agent_execute_contract(translator_client):
    response = translator_client.post(
        "/execute",
        json={
            "session_id": 20,
            "capability": "translation",
            "task_type": "translate_text",
            "input_payload": {"text": "hello", "target_language": "Spanish"},
        },
    )
    assert response.status_code == 200
    body = response.json()
    parsed = parse_execute_response(body)
    assert isinstance(parsed, ExecuteParseSuccess)
    assert body["output_payload"]["translated_text"] == "hola"


def test_dispatch_through_clozr_with_weather_contract(monkeypatch):
    """CLOZR dispatch accepts output from external weather agent shape."""

    def _external_weather_execute(**kwargs):
        client = TestClient(weather_app)
        worker = kwargs["worker"]
        response = client.post(
            f"{worker.endpoint_url.rstrip('/')}/execute",
            json={
                "session_id": kwargs["session_id"],
                "capability": kwargs["capability"],
                "task_type": kwargs["task_type"],
                "input_payload": kwargs["input_payload"],
            },
        )
        if response.status_code >= 400:
            from app.services.session_service import WorkerDispatchError

            raise WorkerDispatchError(
                f"HTTP {response.status_code}", None, error_code=None
            )
        data = response.json()
        parsed = parse_execute_response(data)
        if not isinstance(parsed, ExecuteParseSuccess):
            from app.services.session_service import WorkerDispatchError

            raise WorkerDispatchError(str(parsed), None, error_code="INVALID_WORKER_RESPONSE")
        return parsed.output_payload, parsed.execution_time_ms

    monkeypatch.setattr(session_service, "_call_worker_execute", _external_weather_execute)

    ranked = [
        RankedWorker(
            agent=SimpleNamespace(
                id=10,
                name="External Weather Agent",
                endpoint_url="http://testserver",
            ),
            score=0.9,
            success_rate=1.0,
            score_breakdown={},
        )
    ]
    db = MagicMock()
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    class _FakeSession:
        def __init__(self, **kwargs):
            self.id = 77
            self.status = "pending"
            self.worker_agent_id = None
            self.capability = "weather_lookup"
            self.task_type = "get_weather"
            self.input_payload = kwargs.get("input_payload", {})
            self.output_payload = None
            self.error_message = None
            self.routing_trace = {}
            self.started_at = None
            self.completed_at = None
            self.updated_at = None
            self.requester_agent_id = 1

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
            trace=RoutingTrace(capability=capability),
        ),
    )
    monkeypatch.setattr(session_service, "Session", _FakeSession)
    monkeypatch.setattr(session_service, "log_activity", lambda *a, **k: None)
    monkeypatch.setattr(session_service, "_apply_worker_session_metrics", lambda *a, **k: None)

    result = session_service.dispatch_task(
        db,
        DispatchRequest(
            requester_agent_id=1,
            capability="weather_lookup",
            task_type="get_weather",
            input_payload={"location": "Chicago"},
        ),
    )

    assert result.status == "completed"
    assert result.output_payload["location"] == "Chicago"
    assert result.output_payload["source"] == "external-weather-agent-v1"


def test_dispatch_through_clozr_with_translator_contract(monkeypatch):
    def _external_translator_execute(**kwargs):
        client = TestClient(translator_app)
        response = client.post(
            "/execute",
            json={
                "session_id": kwargs["session_id"],
                "capability": kwargs["capability"],
                "task_type": kwargs["task_type"],
                "input_payload": kwargs["input_payload"],
            },
        )
        data = response.json()
        parsed = parse_execute_response(data)
        assert isinstance(parsed, ExecuteParseSuccess)
        return parsed.output_payload, parsed.execution_time_ms

    monkeypatch.setattr(session_service, "_call_worker_execute", _external_translator_execute)

    ranked = [
        RankedWorker(
            agent=SimpleNamespace(id=11, name="Translator", endpoint_url="http://x"),
            score=0.85,
            success_rate=1.0,
            score_breakdown={},
        )
    ]
    db = MagicMock()
    db.add = MagicMock()
    db.flush = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()

    class _FakeSession:
        def __init__(self, **kwargs):
            self.id = 78
            self.status = "pending"
            self.worker_agent_id = None
            self.capability = "translation"
            self.task_type = "translate_text"
            self.input_payload = kwargs.get("input_payload", {})
            self.output_payload = None
            self.error_message = None
            self.routing_trace = {}
            self.started_at = None
            self.completed_at = None
            self.updated_at = None
            self.requester_agent_id = 1

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
            trace=RoutingTrace(capability=capability),
        ),
    )
    monkeypatch.setattr(session_service, "Session", _FakeSession)
    monkeypatch.setattr(session_service, "log_activity", lambda *a, **k: None)
    monkeypatch.setattr(session_service, "_apply_worker_session_metrics", lambda *a, **k: None)

    result = session_service.dispatch_task(
        db,
        DispatchRequest(
            requester_agent_id=1,
            capability="translation",
            task_type="translate_text",
            input_payload={"text": "hello", "target_language": "Spanish"},
        ),
    )

    assert result.status == "completed"
    assert result.output_payload["translated_text"] == "hola"
