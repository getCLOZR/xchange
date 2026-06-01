"""Shared demo summarizer worker — CLOZR Agent Contract v0.1."""

import os
import time
from typing import Any, Optional

from fastapi import FastAPI, Response
from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    session_id: int
    task_type: str
    capability: str
    input_payload: dict[str, Any] = Field(default_factory=dict)


def create_summarizer_app(
    agent_name: str,
    agent_version: str = "1.0.0",
    title_suffix: str = "",
) -> FastAPI:
    title = f"Demo Summarizer Worker {title_suffix}".strip()
    app = FastAPI(title=title, version=agent_version)

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "agent_name": agent_name,
            "version": agent_version,
        }

    @app.post("/execute")
    def execute(payload: ExecuteRequest):
        start = time.perf_counter()
        delay_ms = int(os.environ.get("ARTIFICIAL_DELAY_MS", "0"))
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

        if payload.input_payload.get("force_timeout") is True:
            time.sleep(35)

        if payload.input_payload.get("force_invalid_json") is True:
            return Response(
                content="not-json-response",
                media_type="application/json",
            )

        if payload.input_payload.get("force_error") is True:
            return _error_response(
                session_id=payload.session_id,
                error_code="FORCED_ERROR",
                message="Forced worker error (demo)",
            )

        text = payload.input_payload.get("text")
        if text is None or (isinstance(text, str) and not text.strip()):
            return _error_response(
                session_id=payload.session_id,
                error_code="INVALID_INPUT",
                message="Missing required field: text",
            )

        if not isinstance(text, str):
            text = str(text)

        preview = text[:120] if text else "(empty input)"
        elapsed_ms = (time.perf_counter() - start) * 1000
        return {
            "status": "success",
            "session_id": payload.session_id,
            "agent_name": agent_name,
            "capability": payload.capability,
            "task_type": payload.task_type,
            "output_payload": {
                "summary": f"[{agent_name}] Demo summary: {preview}",
            },
            "execution_time_ms": round(elapsed_ms, 2),
        }

    return app


def _error_response(
    session_id: int,
    error_code: str,
    message: str,
    details: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": details or {},
    }
