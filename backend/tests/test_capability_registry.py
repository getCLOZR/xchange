"""Tests for capability registry API and grouping logic."""

from datetime import datetime
from types import SimpleNamespace
from typing import Optional
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.services.capability_registry_service import (
    _build_groups,
    compute_success_rate,
    get_capability_group,
    list_capability_registry,
    sort_providers,
)
from app.schemas.capability_registry import CapabilityProvider


def _agent(
    agent_id: int,
    *,
    name: str = "Agent",
    healthy: bool = True,
    active: bool = True,
    total: int = 10,
    successful: int = 9,
    avg_ms: Optional[float] = 10.0,
    cost: int = 1,
):
    return SimpleNamespace(
        id=agent_id,
        name=name,
        endpoint_url=f"http://worker-{agent_id}:9001",
        is_active=active,
        is_healthy=healthy,
        cost_credits=cost,
        avg_response_time_ms=avg_ms,
        total_sessions=total,
        successful_sessions=successful,
        failed_sessions=total - successful,
        created_at=datetime.utcnow(),
    )


def _cap(name: str, agent, input_schema=None, output_schema=None):
    return SimpleNamespace(
        name=name,
        agent=agent,
        input_schema=input_schema or {"type": "object"},
        output_schema=output_schema or {"type": "object"},
    )


def test_compute_success_rate():
    assert compute_success_rate(10, 9) == 0.9
    assert compute_success_rate(0, 0) == 0.0
    assert compute_success_rate(5, 5) == 1.0


def test_sort_providers_healthy_first_then_success_then_latency():
    providers = [
        CapabilityProvider(
            agent_id=1,
            agent_name="Slow unhealthy",
            endpoint_url="http://a",
            is_active=True,
            is_healthy=False,
            cost_credits=1,
            avg_response_time_ms=5.0,
            total_sessions=10,
            successful_sessions=10,
            failed_sessions=0,
            success_rate=1.0,
        ),
        CapabilityProvider(
            agent_id=2,
            agent_name="Fast healthy",
            endpoint_url="http://b",
            is_active=True,
            is_healthy=True,
            cost_credits=1,
            avg_response_time_ms=20.0,
            total_sessions=10,
            successful_sessions=5,
            failed_sessions=5,
            success_rate=0.5,
        ),
        CapabilityProvider(
            agent_id=3,
            agent_name="Best healthy",
            endpoint_url="http://c",
            is_active=True,
            is_healthy=True,
            cost_credits=1,
            avg_response_time_ms=8.0,
            total_sessions=10,
            successful_sessions=9,
            failed_sessions=1,
            success_rate=0.9,
        ),
    ]
    sorted_p = sort_providers(providers)
    assert [p.agent_id for p in sorted_p] == [3, 2, 1]


def test_build_groups_counts_and_alphabetical():
    caps = [
        _cap("translation", _agent(1, name="Translator", healthy=True)),
        _cap("summarization", _agent(2, name="Summarizer A", healthy=True)),
        _cap("summarization", _agent(3, name="Summarizer B", healthy=False)),
    ]
    groups = _build_groups(caps)
    assert [g.name for g in groups] == ["summarization", "translation"]
    summ = groups[0]
    assert summ.provider_count == 2
    assert summ.healthy_provider_count == 1
    assert summ.providers[0].is_healthy is True
    assert summ.providers[0].success_rate == 0.9
    assert summ.providers[1].is_healthy is False


def test_build_groups_empty():
    assert _build_groups([]) == []


def test_list_capabilities_api(client, monkeypatch):
    groups = _build_groups(
        [
            _cap("web_search", _agent(4, name="Search", healthy=True)),
        ]
    )
    from app.schemas.capability_registry import CapabilityRegistryResponse

    monkeypatch.setattr(
        "app.api.routes.capabilities.capability_registry_service.list_capability_registry",
        lambda db: CapabilityRegistryResponse(capabilities=groups),
    )
    response = client.get("/capabilities")
    assert response.status_code == 200
    body = response.json()
    assert body["capabilities"][0]["name"] == "web_search"
    assert body["capabilities"][0]["provider_count"] == 1
    assert body["capabilities"][0]["healthy_provider_count"] == 1


def test_get_capability_api_found(client, monkeypatch):
    group = _build_groups([_cap("weather_lookup", _agent(5, name="Weather"))])[0]
    monkeypatch.setattr(
        "app.api.routes.capabilities.capability_registry_service.get_capability_group",
        lambda db, name: group if name == "weather_lookup" else None,
    )
    response = client.get("/capabilities/weather_lookup")
    assert response.status_code == 200
    assert response.json()["name"] == "weather_lookup"


def test_get_capability_api_not_found(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.capabilities.capability_registry_service.get_capability_group",
        lambda db, name: None,
    )
    response = client.get("/capabilities/missing_cap")
    assert response.status_code == 404


def test_list_capability_registry_queries_db(monkeypatch):
    cap = _cap("summarization", _agent(1))
    mock_db = MagicMock()
    mock_db.scalars.return_value.all.return_value = [cap]
    result = list_capability_registry(mock_db)
    assert len(result.capabilities) == 1
    assert result.capabilities[0].name == "summarization"


def test_get_capability_group_queries_db(monkeypatch):
    cap = _cap("summarization", _agent(1))
    mock_db = MagicMock()
    mock_db.scalars.return_value.all.return_value = [cap]
    group = get_capability_group(mock_db, "summarization")
    assert group is not None
    assert group.provider_count == 1
