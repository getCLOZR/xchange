from datetime import datetime
from types import SimpleNamespace

from fastapi import HTTPException

from app.schemas.agent import AgentSearchResponse, HealthCheckResponse
from app.schemas.session import DispatchResponse
from app.services import agent_service, session_service


def _sample_agent(agent_id: int = 1, capability: str = "summarization"):
    now = datetime.utcnow()
    return SimpleNamespace(
        id=agent_id,
        name=f"Agent {agent_id}",
        description="Test agent",
        endpoint_url="http://localhost:9001",
        owner_name="Demo",
        version="0.1.0",
        cost_credits=1,
        is_active=True,
        is_healthy=True,
        last_health_check=now,
        last_seen_at=now,
        avg_response_time_ms=10.0,
        total_sessions=1,
        successful_sessions=1,
        failed_sessions=0,
        created_at=now,
        capabilities=[
            SimpleNamespace(
                id=1,
                name=capability,
                description="Capability",
                input_schema={},
                output_schema={},
            )
        ],
    )


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "clozr-exchange-api"}


def test_agent_registration(client, monkeypatch):
    fake_agent = _sample_agent(agent_id=1, capability="orchestration_client")

    monkeypatch.setattr(agent_service, "register_agent", lambda db, payload: fake_agent)

    response = client.post(
        "/agents/register",
        json={
            "name": "Demo Requester",
            "description": "Requester",
            "endpoint_url": "http://localhost:8999",
            "owner_name": "Demo",
            "version": "0.1.0",
            "cost_credits": 0,
            "capabilities": [
                {
                    "name": "orchestration_client",
                    "description": "Client",
                    "input_schema": {},
                    "output_schema": {},
                }
            ],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["capabilities"][0]["name"] == "orchestration_client"


def test_capability_search(client, monkeypatch):
    fake_agent = _sample_agent(agent_id=2, capability="summarization")
    monkeypatch.setattr(
        agent_service,
        "search_agents_by_capability",
        lambda db, capability_name: [fake_agent],
    )

    response = client.get("/agents/search", params={"capability": "summarization"})
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["agents"][0]["id"] == 2


def test_worker_health_check(client, monkeypatch):
    fake_agent = SimpleNamespace(id=2)
    monkeypatch.setattr(agent_service, "get_agent_by_id", lambda db, agent_id: fake_agent)
    monkeypatch.setattr(
        agent_service,
        "check_agent_health",
        lambda db, agent: HealthCheckResponse(
            agent_id=agent.id,
            is_healthy=True,
            response_time_ms=12.5,
            checked_at=datetime.utcnow(),
            error_message=None,
        ),
    )

    response = client.post("/agents/2/health-check")
    assert response.status_code == 200
    assert response.json()["is_healthy"] is True


def test_dispatch_success(client, monkeypatch):
    monkeypatch.setattr(
        session_service,
        "dispatch_task",
        lambda db, payload: DispatchResponse(
            session_id=10,
            status="completed",
            worker_agent_id=2,
            capability=payload.capability,
            task_type=payload.task_type,
            output_payload={"result": "ok"},
            error_message=None,
        ),
    )

    response = client.post(
        "/sessions/dispatch",
        json={
            "requester_agent_id": 1,
            "capability": "summarization",
            "task_type": "summarize_text",
            "input_payload": {"text": "hello"},
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_dispatch_failure_no_healthy_worker(client, monkeypatch):
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
    assert "No healthy worker available" in response.json()["detail"]["message"]
