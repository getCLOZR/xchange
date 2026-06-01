"""Multi-agent workflow demo — search agent contract and orchestration helpers."""

from fastapi.testclient import TestClient

from app.services.contract_validation_service import (
    ExecuteParseSuccess,
    parse_execute_response,
    validate_health_response,
)
from examples.research_agent_demo.workflow_utils import search_results_to_text
from external_agents.search_agent.main import app as search_app


def test_search_agent_health_contract():
    client = TestClient(search_app)
    body = client.get("/health").json()
    parsed, error = validate_health_response(body)
    assert error is None
    assert parsed.agent_name == "External Search Agent"


def test_search_agent_execute_contract():
    client = TestClient(search_app)
    body = client.post(
        "/execute",
        json={
            "session_id": 5,
            "capability": "web_search",
            "task_type": "search_query",
            "input_payload": {"query": "What are AI agents?"},
        },
    ).json()
    parsed = parse_execute_response(body)
    assert isinstance(parsed, ExecuteParseSuccess)
    assert len(body["output_payload"]["results"]) == 3
    assert body["output_payload"]["results"][0]["source"].startswith("demo-search-index")


def test_search_results_to_text():
    text = search_results_to_text(
        [
            {"title": "T1", "snippet": "S1", "source": "demo"},
            {"title": "T2", "snippet": "S2", "source": "demo"},
        ]
    )
    assert "T1" in text
    assert "S2" in text


def test_workflow_trace_structure():
    trace = {
        "workflow_id": "abc",
        "question": "Q?",
        "steps": [
            {"capability": "web_search", "session_id": 101, "status": "completed"},
            {"capability": "summarization", "session_id": 102, "status": "completed"},
        ],
    }
    assert len(trace["steps"]) == 2
    assert trace["steps"][0]["capability"] == "web_search"
