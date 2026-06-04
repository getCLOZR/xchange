"""Validate external agent endpoints before onboarding registration."""

from __future__ import annotations

from time import perf_counter
from typing import Any, Optional

import httpx

from app.services.contract_validation_service import (
    ExecuteParseError,
    ExecuteParseInvalid,
    ExecuteParseSuccess,
    parse_execute_response,
    validate_health_response,
)

VALIDATION_TIMEOUT_SECONDS = 10.0
VALIDATION_CAPABILITY = "__validation__"
VALIDATION_TASK_TYPE = "__validation__"
VALIDATION_SESSION_ID = 0


def validate_endpoint(endpoint_url: str) -> dict[str, Any]:
    """GET {endpoint}/health and validate CLOZR health contract."""
    health_url = _health_url(endpoint_url)
    try:
        start = perf_counter()
        with httpx.Client(timeout=VALIDATION_TIMEOUT_SECONDS) as client:
            response = client.get(health_url)
        response_time_ms = (perf_counter() - start) * 1000

        if response.status_code != 200:
            return _endpoint_failure(
                f"Health endpoint returned HTTP {response.status_code} (expected 200)"
            )

        try:
            data = response.json()
        except ValueError:
            return _endpoint_failure("Health response was not valid JSON")

        parsed, error = validate_health_response(data)
        if error:
            return _endpoint_failure(error)

        return {
            "valid": True,
            "agent_name": parsed.agent_name,
            "version": parsed.version,
            "response_time_ms": round(response_time_ms, 2),
            "error": None,
        }
    except httpx.TimeoutException:
        return _endpoint_failure("Endpoint timed out — check URL and network")
    except httpx.ConnectError:
        return _endpoint_failure("Endpoint unreachable — verify URL and that the worker is running")
    except httpx.HTTPError as exc:
        return _endpoint_failure(f"HTTP error: {exc}")


def validate_contract(endpoint_url: str) -> dict[str, Any]:
    """POST {endpoint}/execute with validation probe and validate response contract."""
    execute_url = _execute_url(endpoint_url)
    body = {
        "session_id": VALIDATION_SESSION_ID,
        "capability": VALIDATION_CAPABILITY,
        "task_type": VALIDATION_TASK_TYPE,
        "input_payload": {},
    }

    try:
        with httpx.Client(timeout=VALIDATION_TIMEOUT_SECONDS) as client:
            response = client.post(execute_url, json=body)

        if response.status_code == 404:
            return _contract_failure(
                "Execute endpoint not found (POST /execute returned 404)",
                execute_endpoint=False,
            )

        if response.status_code >= 400:
            return _contract_failure(
                f"Execute endpoint returned HTTP {response.status_code}",
                execute_endpoint=True,
            )

        try:
            data = response.json()
        except ValueError:
            return _contract_failure(
                "Execute response was not valid JSON",
                execute_endpoint=True,
            )

        parsed = parse_execute_response(data)
        if isinstance(parsed, ExecuteParseInvalid):
            return _contract_failure(
                parsed.reason,
                execute_endpoint=True,
                response_contract=False,
            )

        if isinstance(parsed, ExecuteParseSuccess):
            return {
                "valid": True,
                "execute_endpoint": True,
                "response_contract": True,
                "error_handling_valid": True,
                "error": None,
                "response_status": "success",
            }

        if isinstance(parsed, ExecuteParseError):
            return {
                "valid": True,
                "execute_endpoint": True,
                "response_contract": True,
                "error_handling_valid": True,
                "error": None,
                "response_status": "error",
            }

        return _contract_failure("Unexpected execute validation result")
    except httpx.TimeoutException:
        return _contract_failure("Execute request timed out")
    except httpx.ConnectError:
        return _contract_failure("Execute endpoint unreachable")
    except httpx.HTTPError as exc:
        return _contract_failure(f"HTTP error: {exc}")


def _health_url(endpoint_url: str) -> str:
    return f"{endpoint_url.rstrip('/')}/health"


def _execute_url(endpoint_url: str) -> str:
    return f"{endpoint_url.rstrip('/')}/execute"


def _endpoint_failure(error: str) -> dict[str, Any]:
    return {
        "valid": False,
        "agent_name": None,
        "version": None,
        "response_time_ms": None,
        "error": error,
    }


def _contract_failure(
    error: str,
    execute_endpoint: bool = False,
    response_contract: bool = False,
) -> dict[str, Any]:
    return {
        "valid": False,
        "execute_endpoint": execute_endpoint,
        "response_contract": response_contract,
        "error_handling_valid": False,
        "error": error,
        "response_status": None,
    }
