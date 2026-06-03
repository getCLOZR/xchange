"""Reconstruct workflow traces from activity log events."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog
from app.schemas.workflow import WorkflowStepTrace, WorkflowTraceResponse

WORKFLOW_EVENT_TYPES = frozenset(
    {
        "workflow_started",
        "workflow_step_started",
        "workflow_step_completed",
        "workflow_completed",
        "workflow_failed",
    }
)


def list_recent_workflows(db: Session, limit: int = 20) -> list[WorkflowTraceResponse]:
    """Build workflow traces from workflow_* activity events."""
    stmt = (
        select(ActivityLog)
        .where(ActivityLog.event_type.in_(WORKFLOW_EVENT_TYPES))
        .order_by(ActivityLog.created_at.asc())
        .limit(1000)
    )
    logs = list(db.scalars(stmt).all())

    by_workflow: dict[str, dict[str, Any]] = {}

    for log in logs:
        meta = log.event_metadata or {}
        workflow_id = meta.get("workflow_id")
        if not workflow_id:
            continue

        if workflow_id not in by_workflow:
            by_workflow[workflow_id] = {
                "workflow_id": workflow_id,
                "workflow_name": meta.get("workflow_name", "unknown_workflow"),
                "started_at": log.created_at,
                "completed_at": None,
                "status": "in_progress",
                "question": meta.get("question"),
                "steps_by_index": {},
                "next_step_index": 1,
            }

        wf = by_workflow[workflow_id]
        if log.created_at < wf["started_at"]:
            wf["started_at"] = log.created_at
        if meta.get("question"):
            wf["question"] = meta["question"]
        if meta.get("workflow_name"):
            wf["workflow_name"] = meta["workflow_name"]

        if log.event_type == "workflow_started":
            wf["status"] = meta.get("status", "in_progress")
        elif log.event_type in {"workflow_step_started", "workflow_step_completed"}:
            raw_idx = meta.get("step_index")
            if isinstance(raw_idx, int) and raw_idx > 0:
                step_index = raw_idx
            else:
                step_index = wf["next_step_index"]
                wf["next_step_index"] += 1

            existing = wf["steps_by_index"].get(step_index, {"step_index": step_index})
            existing["capability"] = meta.get("capability", existing.get("capability", "unknown"))
            existing["task_type"] = meta.get("task_type", existing.get("task_type"))
            existing["session_id"] = meta.get("session_id", existing.get("session_id"))
            existing["worker_agent_id"] = meta.get(
                "worker_agent_id", existing.get("worker_agent_id")
            )
            if log.event_type == "workflow_step_started":
                existing["status"] = meta.get("status", existing.get("status", "running"))
            else:
                existing["status"] = meta.get("status", "completed")
            wf["steps_by_index"][step_index] = existing
        elif log.event_type == "workflow_completed":
            wf["status"] = meta.get("status", "completed")
            wf["completed_at"] = log.created_at
        elif log.event_type == "workflow_failed":
            wf["status"] = meta.get("status", "failed")
            wf["completed_at"] = log.created_at

    workflows: list[WorkflowTraceResponse] = []
    for wf in by_workflow.values():
        steps = [
            WorkflowStepTrace(**step)
            for _, step in sorted(wf["steps_by_index"].items(), key=lambda item: item[0])
        ]
        workflows.append(
            WorkflowTraceResponse(
                workflow_id=wf["workflow_id"],
                workflow_name=wf["workflow_name"],
                status=wf["status"],
                started_at=wf["started_at"],
                completed_at=wf.get("completed_at"),
                steps=steps,
                question=wf.get("question"),
            )
        )

    workflows.sort(key=lambda w: w.started_at, reverse=True)
    return workflows[:limit]
