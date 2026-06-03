from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.models.activity import ActivityLog
from app.services.workflow_service import list_recent_workflows


def _log(
    event_type: str,
    workflow_id: str,
    workflow_name: str = "research_workflow",
    capability: Optional[str] = None,
    task_type: Optional[str] = None,
    step_index: Optional[int] = None,
    session_id: Optional[int] = None,
    worker_agent_id: Optional[int] = None,
    status: Optional[str] = None,
    question: Optional[str] = "What are AI agents?",
    created_at: Optional[datetime] = None,
) -> ActivityLog:
    meta = {
        "workflow_id": workflow_id,
        "workflow_name": workflow_name,
    }
    if capability is not None:
        meta["capability"] = capability
    if task_type is not None:
        meta["task_type"] = task_type
    if step_index is not None:
        meta["step_index"] = step_index
    if session_id is not None:
        meta["session_id"] = session_id
    if worker_agent_id is not None:
        meta["worker_agent_id"] = worker_agent_id
    if status is not None:
        meta["status"] = status
    if question is not None:
        meta["question"] = question
    return ActivityLog(
        id=1,
        event_type=event_type,
        message=f"{event_type} for {workflow_id}",
        agent_id=7,
        event_metadata=meta,
        created_at=created_at or datetime.utcnow(),
    )


class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _FakeDb:
    def __init__(self, logs):
        self._logs = logs

    def scalars(self, stmt):
        return _FakeScalars(self._logs)


def test_list_recent_workflows_reconstructs_trace():
    wf_id = "test-workflow-123"
    logs = [
        _log("workflow_started", wf_id, created_at=datetime(2026, 6, 1, 12, 0, 0)),
        _log(
            "workflow_step_started",
            wf_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            status="running",
            created_at=datetime(2026, 6, 1, 12, 0, 1),
        ),
        _log(
            "workflow_step_completed",
            wf_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            session_id=6,
            worker_agent_id=9,
            status="completed",
            created_at=datetime(2026, 6, 1, 12, 0, 2),
        ),
        _log(
            "workflow_step_started",
            wf_id,
            step_index=2,
            capability="summarization",
            task_type="summarize_text",
            status="running",
            created_at=datetime(2026, 6, 1, 12, 0, 3),
        ),
        _log(
            "workflow_step_completed",
            wf_id,
            step_index=2,
            capability="summarization",
            task_type="summarize_text",
            session_id=7,
            worker_agent_id=12,
            status="completed",
            created_at=datetime(2026, 6, 1, 12, 0, 4),
        ),
        _log(
            "workflow_completed",
            wf_id,
            status="completed",
            created_at=datetime(2026, 6, 1, 12, 0, 5),
        ),
    ]
    workflows = list_recent_workflows(_FakeDb(logs), limit=10)
    assert len(workflows) == 1
    wf = workflows[0]
    assert wf.workflow_id == wf_id
    assert wf.workflow_name == "research_workflow"
    assert wf.status == "completed"
    assert wf.started_at == datetime(2026, 6, 1, 12, 0, 0)
    assert wf.completed_at == datetime(2026, 6, 1, 12, 0, 5)
    assert len(wf.steps) == 2
    assert wf.steps[0].step_index == 1
    assert wf.steps[0].capability == "web_search"
    assert wf.steps[0].task_type == "search_query"
    assert wf.steps[0].session_id == 6
    assert wf.steps[0].worker_agent_id == 9
    assert wf.steps[1].step_index == 2
    assert wf.steps[1].task_type == "summarize_text"
    assert wf.steps[1].session_id == 7


def test_workflows_recent_endpoint(client, monkeypatch):
    wf_id = "api-test-wf"
    fake = [
        _log("workflow_started", wf_id),
        _log(
            "workflow_step_completed",
            wf_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            session_id=1,
            worker_agent_id=2,
            status="completed",
        ),
        _log("workflow_completed", wf_id, status="completed"),
    ]

    def _fake_list(db, limit=20):
        return list_recent_workflows(_FakeDb(fake), limit=limit)

    monkeypatch.setattr(
        "app.api.routes.workflows.workflow_service.list_recent_workflows",
        _fake_list,
    )
    response = client.get("/workflows/recent")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["workflows"][0]["workflow_id"] == wf_id
    assert body["workflows"][0]["steps"][0]["step_index"] == 1
    assert body["workflows"][0]["steps"][0]["worker_agent_id"] == 2


def test_workflow_failed_event_sets_failed_status():
    wf_id = "failed-workflow-1"
    logs = [
        _log("workflow_started", wf_id, created_at=datetime(2026, 6, 1, 12, 0, 0)),
        _log(
            "workflow_step_started",
            wf_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            status="running",
            created_at=datetime(2026, 6, 1, 12, 0, 1),
        ),
        _log(
            "workflow_failed",
            wf_id,
            status="failed",
            created_at=datetime(2026, 6, 1, 12, 0, 2),
        ),
    ]
    workflows = list_recent_workflows(_FakeDb(logs), limit=10)
    assert len(workflows) == 1
    assert workflows[0].status == "failed"
    assert workflows[0].completed_at == datetime(2026, 6, 1, 12, 0, 2)


def test_workflow_event_can_be_logged_with_metadata():
    from app.services.activity_service import log_activity

    class _ActivityDb:
        def __init__(self):
            self.items = []

        def add(self, entry):
            self.items.append(entry)

    db = _ActivityDb()
    entry = log_activity(
        db,
        event_type="workflow_step_completed",
        message="step finished",
        metadata={
            "workflow_id": "wf-123",
            "workflow_name": "research_workflow",
            "step_index": 1,
            "capability": "web_search",
            "task_type": "search_query",
            "session_id": 10,
            "worker_agent_id": 22,
            "status": "completed",
        },
    )
    assert len(db.items) == 1
    assert entry.event_metadata["workflow_id"] == "wf-123"
    assert entry.event_metadata["worker_agent_id"] == 22
