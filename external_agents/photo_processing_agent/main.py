"""
External Photo Processing Agent — CLOZR Agent Contract v0.1 only.

No imports from CLOZR backend.
Run: uvicorn external_agents.photo_processing_agent.main:app --port 9205
"""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

AGENT_NAME = "External Photo Processing Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "photo_processing"
TASK_TYPE = "process_photo"

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)


class ExecuteRequest(BaseModel):
    session_id: int
    task_type: str
    capability: str
    input_payload: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "agent_name": AGENT_NAME,
        "version": AGENT_VERSION,
    }


@app.post("/execute")
def execute(payload: ExecuteRequest):
    start = time.perf_counter()

    if payload.capability != CAPABILITY:
        return _error(
            payload.session_id,
            "UNSUPPORTED_CAPABILITY",
            f"Expected capability '{CAPABILITY}', got '{payload.capability}'",
        )
    if payload.task_type != TASK_TYPE:
        return _error(
            payload.session_id,
            "UNSUPPORTED_TASK",
            f"Expected task_type '{TASK_TYPE}', got '{payload.task_type}'",
        )

    image_ref = payload.input_payload.get("image_url") or payload.input_payload.get(
        "image_id"
    )
    operation = payload.input_payload.get("operation", "describe")
    if not isinstance(image_ref, str) or not image_ref.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "Missing required field: image_url (or image_id)",
        )
    if not isinstance(operation, str) or not operation.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "operation must be a non-empty string",
        )

    if bool(payload.input_payload.get("force_error")):
        return _error(
            payload.session_id,
            "PROCESSING_FAILED",
            "Forced photo-processing error for demo testing",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "status": "success",
        "session_id": payload.session_id,
        "agent_name": AGENT_NAME,
        "capability": payload.capability,
        "task_type": payload.task_type,
        "output_payload": _fake_processing_result(image_ref.strip(), operation.strip()),
        "execution_time_ms": round(elapsed_ms, 2),
    }


def _fake_processing_result(image_ref: str, operation: str) -> dict[str, Any]:
    # Deterministic demo output from input text.
    seed = sum(ord(c) for c in f"{image_ref}:{operation}") % 100
    return {
        "image_ref": image_ref,
        "operation": operation,
        "detected_objects": [
            {"label": "person", "confidence": round(0.6 + (seed % 20) / 100, 2)},
            {"label": "vehicle", "confidence": round(0.4 + (seed % 25) / 100, 2)},
        ],
        "quality_score": 65 + (seed % 30),
        "notes": "Demo-only output from external-photo-processing-agent-v1",
    }


def _error(session_id: int, error_code: str, message: str) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": {},
    }
