from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Demo Summarizer Worker",
    description="Local demo worker for CLOZR Exchange task dispatch",
    version="0.1.0",
)


class ExecuteRequest(BaseModel):
    session_id: int
    task_type: str
    capability: str
    input_payload: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health():
    return {"status": "ok", "service": "demo-summarizer-worker"}


@app.post("/execute")
def execute(payload: ExecuteRequest):
    text = payload.input_payload.get("text", "")
    if not isinstance(text, str):
        text = str(text)

    preview = text[:120] if text else "(empty input)"
    return {
        "result": f"Demo summary: {preview}",
        "worker": "demo-summarizer-agent",
        "session_id": payload.session_id,
        "task_type": payload.task_type,
        "capability": payload.capability,
    }
