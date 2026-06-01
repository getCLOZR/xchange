"""Shared demo summarizer worker logic for multi-worker routing tests."""

import os
import time
from typing import Any

from fastapi import FastAPI, Response, status
from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    session_id: int
    task_type: str
    capability: str
    input_payload: dict[str, Any] = Field(default_factory=dict)


def create_summarizer_app(
    worker_id: str,
    worker_label: str,
    title_suffix: str = "",
) -> FastAPI:
    title = f"Demo Summarizer Worker {title_suffix}".strip()
    app = FastAPI(title=title, version="0.2.0")

    @app.get("/health")
    def health():
        return {"status": "ok", "agent": worker_id}

    @app.post("/execute")
    def execute(payload: ExecuteRequest):
        delay_ms = int(os.environ.get("ARTIFICIAL_DELAY_MS", "0"))
        if delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

        if payload.input_payload.get("force_timeout") is True:
            time.sleep(35)

        if payload.input_payload.get("force_error") is True:
            return Response(
                content='{"error":"forced worker error"}',
                media_type="application/json",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if payload.input_payload.get("force_invalid_json") is True:
            return Response(
                content="not-json-response",
                media_type="application/json",
                status_code=status.HTTP_200_OK,
            )

        text = payload.input_payload.get("text", "")
        if not isinstance(text, str):
            text = str(text)

        preview = text[:120] if text else "(empty input)"
        return {
            "result": f"[{worker_label}] Demo summary: {preview}",
            "worker": worker_id,
            "session_id": payload.session_id,
            "task_type": payload.task_type,
            "capability": payload.capability,
        }

    return app
