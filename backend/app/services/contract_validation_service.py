"""Validate CLOZR Agent Contract v0.1 worker responses."""

from dataclasses import dataclass
from typing import Any, Optional, Union

from pydantic import ValidationError

from app.schemas.worker_contract import (
    WorkerExecuteErrorResponse,
    WorkerExecuteSuccessResponse,
    WorkerHealthResponse,
)


@dataclass
class ExecuteParseSuccess:
    output_payload: dict[str, Any]
    execution_time_ms: float


@dataclass
class ExecuteParseError:
    error_code: str
    message: str
    details: dict[str, Any]


@dataclass
class ExecuteParseInvalid:
    reason: str


ExecuteParseResult = Union[ExecuteParseSuccess, ExecuteParseError, ExecuteParseInvalid]


def validate_health_response(data: Any) -> tuple[Optional[WorkerHealthResponse], Optional[str]]:
    """Return (parsed health response, error message)."""
    if not isinstance(data, dict):
        return None, "Health response must be a JSON object"
    try:
        parsed = WorkerHealthResponse.model_validate(data)
    except ValidationError as exc:
        return None, f"Invalid health response: {exc.errors()[0]['msg']}"
    if parsed.status != "ok":
        return None, f"Health status must be 'ok', got '{parsed.status}'"
    return parsed, None


def parse_execute_response(data: Any) -> ExecuteParseResult:
    """Parse and validate a worker /execute JSON body."""
    if not isinstance(data, dict):
        return ExecuteParseInvalid(reason="Execute response must be a JSON object")

    status = data.get("status")
    if status is None:
        return ExecuteParseInvalid(reason="Execute response missing required field: status")

    if status == "success":
        try:
            parsed = WorkerExecuteSuccessResponse.model_validate(data)
        except ValidationError as exc:
            return ExecuteParseInvalid(
                reason=f"Invalid success response: {_first_validation_message(exc)}"
            )
        return ExecuteParseSuccess(
            output_payload=parsed.output_payload,
            execution_time_ms=parsed.execution_time_ms,
        )

    if status == "error":
        try:
            parsed = WorkerExecuteErrorResponse.model_validate(data)
        except ValidationError as exc:
            return ExecuteParseInvalid(
                reason=f"Invalid error response: {_first_validation_message(exc)}"
            )
        return ExecuteParseError(
            error_code=parsed.error_code,
            message=parsed.message,
            details=parsed.details,
        )

    return ExecuteParseInvalid(reason=f"Unknown execute status: {status!r}")


def _first_validation_message(exc: ValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "validation failed"
    return str(errors[0].get("msg", "validation failed"))
