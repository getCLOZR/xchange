"""Shared helpers for ecommerce demo workers (no CLOZR backend imports)."""

from typing import Any


def error_response(session_id: int, error_code: str, message: str) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": {},
    }


def success_response(
    *,
    session_id: int,
    agent_name: str,
    capability: str,
    task_type: str,
    output_payload: dict[str, Any],
    execution_time_ms: float,
) -> dict[str, Any]:
    return {
        "status": "success",
        "session_id": session_id,
        "agent_name": agent_name,
        "capability": capability,
        "task_type": task_type,
        "output_payload": output_payload,
        "execution_time_ms": round(execution_time_ms, 2),
    }
