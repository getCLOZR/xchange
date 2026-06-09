"""Tests for POST /workflows/ecommerce-launch."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.schemas.ecommerce_workflow import EcommerceLaunchRequest
from app.schemas.session import DispatchResponse
from app.services import ecommerce_launch_service
from app.services.ecommerce_launch_service import run_ecommerce_launch_workflow
from external_agents.product_research_agent.main import app as research_app
from fastapi.testclient import TestClient


def _dispatch_ok(session_id: int, capability: str, task_type: str, output: dict):
    return DispatchResponse(
        session_id=session_id,
        status="completed",
        worker_agent_id=session_id + 10,
        capability=capability,
        task_type=task_type,
        output_payload=output,
        routing_trace={
            "selected_agent_id": session_id + 10,
            "selection_reason": "Highest routing score among healthy active candidates",
            "filters": ["active=true", "is_healthy=true"],
        },
    )


def test_product_research_agent_contract():
    client = TestClient(research_app)
    health = client.get("/health")
    assert health.status_code == 200
    execute = client.post(
        "/execute",
        json={
            "session_id": 1,
            "capability": "product_research",
            "task_type": "research_product",
            "input_payload": {
                "product_name": "Protein Shaker Bottle",
                "target_market": "US fitness customers",
            },
        },
    )
    assert execute.status_code == 200
    body = execute.json()
    assert body["status"] == "success"
    assert "market_summary" in body["output_payload"]
    assert len(body["output_payload"]["competitors"]) >= 2


def test_ecommerce_workflow_success(client, monkeypatch):
    outputs = [
        {
            "market_summary": "Fitness buyers want durability.",
            "competitors": [{"name": "A", "positioning": "x", "price_range": "$10"}],
            "customer_angles": ["leak-proof"],
        },
        {
            "primary_keywords": ["protein shaker bottle"],
            "long_tail_keywords": ["best gym shaker"],
        },
        {
            "product_title": "Protein Shaker — Leak-Proof",
            "product_description": "Great shaker.",
            "bullet_points": ["Leak-proof lid"],
            "meta_description": "Buy the best shaker.",
        },
        {
            "ad_copy": [{"channel": "Meta Ads", "copy": "Launch now."}],
            "email_subjects": ["Launch day"],
            "launch_angle": "Trustworthy daily shaker",
        },
    ]
    call_count = {"n": 0}

    def _fake_dispatch(db, req):
        idx = call_count["n"]
        call_count["n"] += 1
        cap = req.capability
        return _dispatch_ok(100 + idx, cap, req.task_type, outputs[idx])

    monkeypatch.setattr(
        ecommerce_launch_service,
        "get_agent_by_id",
        lambda db, aid: SimpleNamespace(id=aid, name="Requester"),
    )
    monkeypatch.setattr(ecommerce_launch_service, "dispatch_task", _fake_dispatch)
    monkeypatch.setattr(ecommerce_launch_service, "log_activity", lambda *a, **k: MagicMock())

    response = client.post(
        "/workflows/ecommerce-launch",
        json={
            "requester_agent_id": 1,
            "product_name": "Protein Shaker Bottle",
            "target_market": "US fitness customers",
            "tone": "modern, trustworthy, high-converting",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["workflow_status"] == "completed"
    assert body["product_title"] == "Protein Shaker — Leak-Proof"
    assert len(body["seo_keywords"]) == 2
    assert len(body["workflow_trace"]["steps"]) == 4
    assert call_count["n"] == 4


def test_ecommerce_workflow_fails_without_provider(client, monkeypatch):
    monkeypatch.setattr(
        ecommerce_launch_service,
        "get_agent_by_id",
        lambda db, aid: SimpleNamespace(id=aid, name="Requester"),
    )
    def _raise_no_worker(db, req):
        raise HTTPException(status_code=404, detail={"message": "No healthy worker"})

    monkeypatch.setattr(ecommerce_launch_service, "dispatch_task", _raise_no_worker)
    monkeypatch.setattr(ecommerce_launch_service, "log_activity", lambda *a, **k: MagicMock())

    response = client.post(
        "/workflows/ecommerce-launch",
        json={
            "requester_agent_id": 1,
            "product_name": "Protein Shaker Bottle",
            "target_market": "US fitness customers",
        },
    )
    assert response.status_code == 502


def test_build_step_input_chains_context():
    ctx = {
        "product_name": "Bottle",
        "target_market": "US",
        "tone": "modern",
        "market_summary": "Summary",
        "primary_keywords": ["kw"],
        "customer_angles": ["angle"],
        "product_title": "Title",
        "product_description": "Desc",
    }
    assert ecommerce_launch_service._build_step_input(2, ctx)["market_summary"] == "Summary"
    assert ecommerce_launch_service._build_step_input(4, ctx)["product_title"] == "Title"
