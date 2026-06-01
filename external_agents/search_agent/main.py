"""
External Search Agent — CLOZR Agent Contract v0.1 only.

No imports from CLOZR backend. Run: uvicorn external_agents.search_agent.main:app --port 9103
"""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

AGENT_NAME = "External Search Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "web_search"
TASK_TYPE = "search_query"

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

    query = payload.input_payload.get("query")
    if not isinstance(query, str) or not query.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "Missing required field: query",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "status": "success",
        "session_id": payload.session_id,
        "agent_name": AGENT_NAME,
        "capability": payload.capability,
        "task_type": payload.task_type,
        "output_payload": {
            "results": _fake_search_results(query.strip()),
        },
        "execution_time_ms": round(elapsed_ms, 2),
    }


def _fake_search_results(query: str) -> list[dict[str, str]]:
    """Deterministic demo results — no real internet access."""
    seed = sum(ord(c) for c in query.lower()) % 1000
    base_title = query[:60] if len(query) <= 60 else query[:57] + "..."
    templates = [
        (
            f"Overview: {base_title}",
            f"Introductory article explaining {query} for newcomers (demo).",
        ),
        (
            f"How {base_title} works",
            f"Technical breakdown of concepts related to {query} (demo).",
        ),
        (
            f"Future of {base_title}",
            f"Trends and predictions about {query} (demo).",
        ),
    ]
    results = []
    for i, (title, snippet) in enumerate(templates):
        results.append(
            {
                "title": title,
                "snippet": snippet,
                "source": f"demo-search-index-{seed + i}",
            }
        )
    return results


def _error(session_id: int, error_code: str, message: str) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": {},
    }
