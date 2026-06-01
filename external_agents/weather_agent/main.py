"""
External Weather Agent — CLOZR Agent Contract v0.1 only.

No imports from CLOZR backend. Run: uvicorn external_agents.weather_agent.main:app --port 9101
"""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

AGENT_NAME = "External Weather Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "weather_lookup"
TASK_TYPE = "get_weather"

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

    location = payload.input_payload.get("location")
    if not isinstance(location, str) or not location.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "Missing required field: location",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "status": "success",
        "session_id": payload.session_id,
        "agent_name": AGENT_NAME,
        "capability": payload.capability,
        "task_type": payload.task_type,
        "output_payload": _fake_weather(location.strip()),
        "execution_time_ms": round(elapsed_ms, 2),
    }


def _fake_weather(location: str) -> dict[str, Any]:
    seed = sum(ord(c) for c in location.lower()) % 100
    conditions = ["Sunny", "Partly cloudy", "Overcast", "Light rain"][seed % 4]
    return {
        "location": location,
        "temperature_f": 42 + (seed % 35),
        "conditions": conditions,
        "humidity_percent": 35 + (seed % 45),
        "wind_mph": 5 + (seed % 15),
        "source": "external-weather-agent-v1",
    }


def _error(session_id: int, error_code: str, message: str) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": {},
    }
