"""Tests for POST /validation/endpoint and POST /validation/contract."""

from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from demo_agents.summarizer_worker_common import create_summarizer_app


@pytest.fixture
def demo_worker_client() -> TestClient:
    app = create_summarizer_app(agent_name="Demo Summarizer Agent", agent_version="1.0.0")
    return TestClient(app)


def _mock_httpx_client(get_response=None, post_response=None, get_side_effect=None, post_side_effect=None):
    mock_client = MagicMock()
    if get_side_effect is not None:
        mock_client.get.side_effect = get_side_effect
    else:
        mock_client.get.return_value = get_response
    if post_side_effect is not None:
        mock_client.post.side_effect = post_side_effect
    else:
        mock_client.post.return_value = post_response
    mock_ctx = MagicMock()
    mock_ctx.__enter__.return_value = mock_client
    mock_ctx.__exit__.return_value = None
    return mock_ctx


def test_validate_endpoint_success(client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "ok",
        "agent_name": "Weather Agent",
        "version": "1.0.0",
    }
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(get_response=mock_response),
    ):
        response = client.post(
            "/validation/endpoint",
            json={"endpoint_url": "http://weather-agent:9101"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["agent_name"] == "Weather Agent"
    assert body["version"] == "1.0.0"
    assert body["response_time_ms"] is not None
    assert body["error"] is None


def test_validate_endpoint_unreachable(client):
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(
            get_side_effect=httpx.ConnectError("connection refused")
        ),
    ):
        response = client.post(
            "/validation/endpoint",
            json={"endpoint_url": "http://missing-agent:9999"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert "unreachable" in body["error"].lower()


def test_validate_endpoint_invalid_health_contract(client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "degraded", "agent_name": "X", "version": "1"}
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(get_response=mock_response),
    ):
        response = client.post(
            "/validation/endpoint",
            json={"endpoint_url": "http://bad-health:9101"},
        )
    assert response.json()["valid"] is False
    assert "ok" in response.json()["error"].lower()


def test_validate_endpoint_non_json(client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.side_effect = ValueError("not json")
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(get_response=mock_response),
    ):
        response = client.post(
            "/validation/endpoint",
            json={"endpoint_url": "http://bad-json:9101"},
        )
    assert response.json()["valid"] is False
    assert "json" in response.json()["error"].lower()


def test_validate_endpoint_timeout(client):
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(get_side_effect=httpx.TimeoutException("timed out")),
    ):
        response = client.post(
            "/validation/endpoint",
            json={"endpoint_url": "http://slow-agent:9101"},
        )
    assert response.json()["valid"] is False
    assert "timed out" in response.json()["error"].lower()


def test_validate_contract_success_response(client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "error",
        "session_id": 0,
        "error_code": "INVALID_INPUT",
        "message": "Missing required field: text",
        "details": {},
    }
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(post_response=mock_response),
    ):
        response = client.post(
            "/validation/contract",
            json={"endpoint_url": "http://demo-worker:9001"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["execute_endpoint"] is True
    assert body["response_contract"] is True
    assert body["error_handling_valid"] is True
    assert body["response_status"] == "error"


def test_validate_contract_execute_not_found(client):
    mock_response = MagicMock()
    mock_response.status_code = 404
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(post_response=mock_response),
    ):
        response = client.post(
            "/validation/contract",
            json={"endpoint_url": "http://no-execute:9101"},
        )
    body = response.json()
    assert body["valid"] is False
    assert body["execute_endpoint"] is False
    assert "404" in body["error"]


def test_validate_contract_invalid_execute_shape(client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"unexpected": True}
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(post_response=mock_response),
    ):
        response = client.post(
            "/validation/contract",
            json={"endpoint_url": "http://bad-contract:9101"},
        )
    body = response.json()
    assert body["valid"] is False
    assert body["execute_endpoint"] is True
    assert body["response_contract"] is False


def test_validate_contract_timeout(client):
    with patch(
        "app.services.validation_service.httpx.Client",
        return_value=_mock_httpx_client(
            post_side_effect=httpx.TimeoutException("timed out")
        ),
    ):
        response = client.post(
            "/validation/contract",
            json={"endpoint_url": "http://slow-agent:9101"},
        )
    body = response.json()
    assert body["valid"] is False
    assert "timed out" in body["error"].lower()


def test_demo_worker_accepts_validation_probe(demo_worker_client):
    """Demo worker returns contract-valid error for empty validation input."""
    from app.services.contract_validation_service import ExecuteParseError, parse_execute_response

    execute = demo_worker_client.post(
        "/execute",
        json={
            "session_id": 0,
            "capability": "__validation__",
            "task_type": "__validation__",
            "input_payload": {},
        },
    )
    assert execute.status_code == 200
    parsed = parse_execute_response(execute.json())
    assert isinstance(parsed, ExecuteParseError)
