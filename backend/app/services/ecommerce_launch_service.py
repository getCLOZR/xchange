"""Ecommerce launch workflow — multi-step orchestration via CLOZR dispatch."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session as DbSession

from app.schemas.ecommerce_workflow import (
    EcommerceLaunchRequest,
    EcommerceLaunchResponse,
    EcommerceWorkflowStepTrace,
)
from app.schemas.session import DispatchRequest, DispatchResponse
from app.services.activity_service import log_activity
from app.services.agent_service import get_agent_by_id
from app.services.session_service import dispatch_task

WORKFLOW_NAME = "ecommerce_launch_workflow"

STEPS: list[tuple[str, str]] = [
    ("product_research", "research_product"),
    ("seo_keywords", "generate_seo_keywords"),
    ("product_copy", "generate_product_copy"),
    ("marketing_copy", "generate_marketing_copy"),
]


def run_ecommerce_launch_workflow(
    db: DbSession, payload: EcommerceLaunchRequest
) -> EcommerceLaunchResponse:
    requester = get_agent_by_id(db, payload.requester_agent_id)
    if requester is None:
        raise HTTPException(
            status_code=404,
            detail=f"Requester agent {payload.requester_agent_id} not found",
        )

    workflow_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    step_traces: list[EcommerceWorkflowStepTrace] = []
    context: dict[str, Any] = {
        "product_name": payload.product_name,
        "target_market": payload.target_market,
        "tone": payload.tone,
    }

    log_activity(
        db,
        event_type="workflow_started",
        message=(
            f"Ecommerce launch workflow started for '{payload.product_name}' "
            f"(workflow_id={workflow_id})"
        ),
        agent_id=payload.requester_agent_id,
        metadata={
            "workflow_id": workflow_id,
            "workflow_name": WORKFLOW_NAME,
            "status": "in_progress",
            "product_name": payload.product_name,
            "target_market": payload.target_market,
            "tone": payload.tone,
            "question": payload.product_name,
        },
    )
    db.commit()

    try:
        for step_index, (capability, task_type) in enumerate(STEPS, start=1):
            step_input = _build_step_input(step_index, context)
            _log_step_started(
                db,
                workflow_id,
                payload,
                step_index,
                capability,
                task_type,
            )
            db.commit()

            try:
                dispatch = dispatch_task(
                    db,
                    DispatchRequest(
                        requester_agent_id=payload.requester_agent_id,
                        capability=capability,
                        task_type=task_type,
                        input_payload=step_input,
                    ),
                )
            except HTTPException as exc:
                detail = exc.detail
                msg = detail.get("message") if isinstance(detail, dict) else str(detail)
                raise WorkflowStepError(step_index, capability, msg or "Dispatch failed") from exc

            if dispatch.status != "completed" or not dispatch.output_payload:
                raise WorkflowStepError(
                    step_index=step_index,
                    capability=capability,
                    message=dispatch.error_message or f"Step {capability} failed",
                    dispatch=dispatch,
                )

            _merge_step_output(step_index, context, dispatch.output_payload)
            preview = _output_preview(step_index, dispatch.output_payload)
            exec_ms = _execution_time_ms(dispatch)

            step_trace = EcommerceWorkflowStepTrace(
                step_index=step_index,
                capability=capability,
                task_type=task_type,
                session_id=dispatch.session_id,
                worker_agent_id=dispatch.worker_agent_id,
                status=dispatch.status,
                routing_summary=_routing_summary(dispatch),
                execution_time_ms=exec_ms,
                output_preview=preview,
            )
            step_traces.append(step_trace)

            _log_step_completed(
                db,
                workflow_id,
                payload,
                step_trace,
            )
            db.commit()

        finished = datetime.utcnow()
        workflow_trace = _build_workflow_trace(
            workflow_id=workflow_id,
            payload=payload,
            steps=step_traces,
            status="completed",
            started_at=started_at,
            completed_at=finished,
        )

        log_activity(
            db,
            event_type="workflow_completed",
            message=f"Ecommerce launch workflow completed (workflow_id={workflow_id})",
            agent_id=payload.requester_agent_id,
            metadata={
                "workflow_id": workflow_id,
                "workflow_name": WORKFLOW_NAME,
                "status": "completed",
                "product_name": payload.product_name,
            },
        )
        db.commit()

        return _build_response(payload, context, workflow_id, workflow_trace, "completed")

    except WorkflowStepError as exc:
        if exc.dispatch:
            step_traces.append(
                EcommerceWorkflowStepTrace(
                    step_index=exc.step_index,
                    capability=exc.capability,
                    task_type=STEPS[exc.step_index - 1][1],
                    session_id=exc.dispatch.session_id,
                    worker_agent_id=exc.dispatch.worker_agent_id,
                    status=exc.dispatch.status,
                    routing_summary=_routing_summary(exc.dispatch),
                    output_preview=None,
                )
            )
        _log_workflow_failed(db, workflow_id, payload, str(exc))
        db.commit()
        workflow_trace = _build_workflow_trace(
            workflow_id=workflow_id,
            payload=payload,
            steps=step_traces,
            status="failed",
            started_at=started_at,
            completed_at=datetime.utcnow(),
            error=str(exc),
        )
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(exc),
                "workflow_id": workflow_id,
                "workflow_trace": workflow_trace,
            },
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        _log_workflow_failed(db, workflow_id, payload, str(exc))
        db.commit()
        raise HTTPException(
            status_code=500,
            detail={"message": str(exc), "workflow_id": workflow_id},
        ) from exc


class WorkflowStepError(Exception):
    def __init__(
        self,
        step_index: int,
        capability: str,
        message: str,
        dispatch: Optional[DispatchResponse] = None,
    ):
        super().__init__(message)
        self.step_index = step_index
        self.capability = capability
        self.dispatch = dispatch


def _build_step_input(step_index: int, context: dict[str, Any]) -> dict[str, Any]:
    if step_index == 1:
        return {
            "product_name": context["product_name"],
            "target_market": context["target_market"],
        }
    if step_index == 2:
        return {
            "product_name": context["product_name"],
            "target_market": context["target_market"],
            "market_summary": context.get("market_summary", ""),
        }
    if step_index == 3:
        return {
            "product_name": context["product_name"],
            "target_market": context["target_market"],
            "primary_keywords": context.get("primary_keywords", []),
            "customer_angles": context.get("customer_angles", []),
        }
    return {
        "product_name": context["product_name"],
        "product_title": context.get("product_title", context["product_name"]),
        "product_description": context.get("product_description", ""),
        "tone": context["tone"],
    }


def _merge_step_output(step_index: int, context: dict[str, Any], output: dict[str, Any]) -> None:
    if step_index == 1:
        context["market_summary"] = output.get("market_summary", "")
        context["competitors"] = output.get("competitors", [])
        context["customer_angles"] = output.get("customer_angles", [])
    elif step_index == 2:
        context["primary_keywords"] = output.get("primary_keywords", [])
        context["long_tail_keywords"] = output.get("long_tail_keywords", [])
        context["search_intent"] = output.get("search_intent")
        context["seo_angle"] = output.get("seo_angle")
        # Preserve the full worker response for the demo outcome UI.
        context["seo_agent_output"] = output
    elif step_index == 3:
        context["product_title"] = output.get("product_title", "")
        context["product_description"] = output.get("product_description", "")
        context["bullet_points"] = output.get("bullet_points", [])
        context["meta_description"] = output.get("meta_description", "")
    else:
        context["ad_copy"] = output.get("ad_copy", [])
        context["email_subjects"] = output.get("email_subjects", [])
        context["launch_angle"] = output.get("launch_angle")


def _output_preview(step_index: int, output: dict[str, Any]) -> dict[str, Any]:
    if step_index == 1:
        return {
            "market_summary": (output.get("market_summary") or "")[:200],
            "competitor_count": len(output.get("competitors") or []),
        }
    if step_index == 2:
        return {
            "primary_keywords": (output.get("primary_keywords") or [])[:4],
        }
    if step_index == 3:
        return {
            "product_title": output.get("product_title"),
        }
    return {
        "ad_channels": [a.get("channel") for a in (output.get("ad_copy") or [])],
        "email_subjects": (output.get("email_subjects") or [])[:2],
    }


def _routing_summary(dispatch: DispatchResponse) -> Optional[dict[str, Any]]:
    trace = dispatch.routing_trace or {}
    return {
        "selected_agent_id": trace.get("selected_agent_id"),
        "selection_reason": trace.get("selection_reason"),
        "filters": trace.get("filters"),
    }


def _execution_time_ms(dispatch: DispatchResponse) -> Optional[float]:
    trace = dispatch.routing_trace or {}
    attempts = trace.get("attempts") or []
    if attempts and attempts[-1].get("response_time_ms") is not None:
        return float(attempts[-1]["response_time_ms"])
    return None


def _build_workflow_trace(
    *,
    workflow_id: str,
    payload: EcommerceLaunchRequest,
    steps: list[EcommerceWorkflowStepTrace],
    status: str,
    started_at: datetime,
    completed_at: datetime,
    error: Optional[str] = None,
) -> dict[str, Any]:
    trace: dict[str, Any] = {
        "workflow_id": workflow_id,
        "workflow_name": WORKFLOW_NAME,
        "status": status,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "product_name": payload.product_name,
        "target_market": payload.target_market,
        "tone": payload.tone,
        "steps": [s.model_dump(exclude_none=True) for s in steps],
    }
    if error:
        trace["error"] = error
    return trace


def _build_response(
    payload: EcommerceLaunchRequest,
    context: dict[str, Any],
    workflow_id: str,
    workflow_trace: dict[str, Any],
    status: str,
) -> EcommerceLaunchResponse:
    primary = context.get("primary_keywords") or []
    long_tail = context.get("long_tail_keywords") or []
    return EcommerceLaunchResponse(
        product_name=payload.product_name,
        target_market=payload.target_market,
        tone=payload.tone,
        market_summary=context.get("market_summary"),
        competitors=context.get("competitors") or [],
        customer_angles=context.get("customer_angles") or [],
        seo_keywords=list(primary) + list(long_tail),
        primary_keywords=primary,
        long_tail_keywords=long_tail,
        product_title=context.get("product_title"),
        product_description=context.get("product_description"),
        bullet_points=context.get("bullet_points") or [],
        meta_description=context.get("meta_description"),
        ad_copy=context.get("ad_copy") or [],
        email_subjects=context.get("email_subjects") or [],
        launch_angle=context.get("launch_angle"),
        seo_agent_output=context.get("seo_agent_output"),
        workflow_status=status,
        workflow_id=workflow_id,
        workflow_trace=workflow_trace,
    )


def _log_step_started(
    db: DbSession,
    workflow_id: str,
    payload: EcommerceLaunchRequest,
    step_index: int,
    capability: str,
    task_type: str,
) -> None:
    log_activity(
        db,
        event_type="workflow_step_started",
        message=f"Step {step_index} started: {capability}",
        agent_id=payload.requester_agent_id,
        metadata={
            "workflow_id": workflow_id,
            "workflow_name": WORKFLOW_NAME,
            "step_index": step_index,
            "capability": capability,
            "task_type": task_type,
            "status": "running",
            "product_name": payload.product_name,
        },
    )


def _log_step_completed(
    db: DbSession,
    workflow_id: str,
    payload: EcommerceLaunchRequest,
    step: EcommerceWorkflowStepTrace,
) -> None:
    log_activity(
        db,
        event_type="workflow_step_completed",
        message=(
            f"Step {step.step_index} completed: {step.capability} "
            f"(session {step.session_id})"
        ),
        agent_id=payload.requester_agent_id,
        metadata={
            "workflow_id": workflow_id,
            "workflow_name": WORKFLOW_NAME,
            "step_index": step.step_index,
            "capability": step.capability,
            "task_type": step.task_type,
            "session_id": step.session_id,
            "worker_agent_id": step.worker_agent_id,
            "status": step.status,
            "product_name": payload.product_name,
        },
    )


def _log_workflow_failed(
    db: DbSession,
    workflow_id: str,
    payload: EcommerceLaunchRequest,
    error: str,
) -> None:
    log_activity(
        db,
        event_type="workflow_failed",
        message=f"Ecommerce launch workflow failed: {error}",
        agent_id=payload.requester_agent_id,
        metadata={
            "workflow_id": workflow_id,
            "workflow_name": WORKFLOW_NAME,
            "status": "failed",
            "product_name": payload.product_name,
            "error": error,
        },
    )
