"""Minimal CLOZR Exchange HTTP client for the research workflow demo (no backend imports)."""

from __future__ import annotations

import os
from typing import Any, Optional

import httpx

DEFAULT_API_URL = "http://localhost:8000"
DISPATCH_TIMEOUT_SECONDS = 60.0


class ClozrClientError(RuntimeError):
    pass


class ClozrClient:
    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = (base_url or os.environ.get("CLOZR_API_URL", DEFAULT_API_URL)).rstrip(
            "/"
        )

    def log_activity(
        self,
        event_type: str,
        message: str,
        agent_id: Optional[int] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"event_type": event_type, "message": message}
        if agent_id is not None:
            payload["agent_id"] = agent_id
        response = httpx.post(f"{self.base_url}/activity/log", json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()

    def dispatch(
        self,
        requester_agent_id: int,
        capability: str,
        task_type: str,
        input_payload: dict[str, Any],
    ) -> dict[str, Any]:
        response = httpx.post(
            f"{self.base_url}/sessions/dispatch",
            json={
                "requester_agent_id": requester_agent_id,
                "capability": capability,
                "task_type": task_type,
                "input_payload": input_payload,
            },
            timeout=DISPATCH_TIMEOUT_SECONDS,
        )
        if response.status_code >= 400:
            detail = response.json().get("detail", response.text)
            raise ClozrClientError(f"Dispatch failed ({response.status_code}): {detail}")
        return response.json()

    def health_check_agent(self, agent_id: int) -> dict[str, Any]:
        response = httpx.post(
            f"{self.base_url}/agents/{agent_id}/health-check",
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
