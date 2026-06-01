"""
External Translator Agent — CLOZR Agent Contract v0.1 only.

No imports from CLOZR backend. Run: uvicorn external_agents.translator_agent.main:app --port 9102
"""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

AGENT_NAME = "External Translator Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "translation"
TASK_TYPE = "translate_text"

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)

_DEMO_TRANSLATIONS = {
    ("hello", "spanish"): "hola",
    ("hello", "french"): "bonjour",
    ("goodbye", "spanish"): "adiós",
    ("goodbye", "french"): "au revoir",
}


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

    text = payload.input_payload.get("text")
    target_language = payload.input_payload.get("target_language")
    if not isinstance(text, str) or not text.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "Missing required field: text",
        )
    if not isinstance(target_language, str) or not target_language.strip():
        return _error(
            payload.session_id,
            "INVALID_INPUT",
            "Missing required field: target_language",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "status": "success",
        "session_id": payload.session_id,
        "agent_name": AGENT_NAME,
        "capability": payload.capability,
        "task_type": payload.task_type,
        "output_payload": _fake_translation(text.strip(), target_language.strip()),
        "execution_time_ms": round(elapsed_ms, 2),
    }


def _fake_translation(text: str, target_language: str) -> dict[str, Any]:
    key = (text.lower(), target_language.lower())
    translated = _DEMO_TRANSLATIONS.get(
        key,
        f"[demo {target_language}] {text}",
    )
    return {
        "original_text": text,
        "target_language": target_language,
        "translated_text": translated,
        "source": "external-translator-agent-v1",
    }


def _error(session_id: int, error_code: str, message: str) -> dict[str, Any]:
    return {
        "status": "error",
        "session_id": session_id,
        "error_code": error_code,
        "message": message,
        "details": {},
    }
