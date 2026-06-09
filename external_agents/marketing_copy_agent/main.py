"""Marketing Copy Agent — CLOZR Agent Contract v0.1."""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from external_agents.ecommerce_common import error_response, success_response

AGENT_NAME = "Marketing Copy Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "marketing_copy"
TASK_TYPE = "generate_marketing_copy"

app = FastAPI(title=AGENT_NAME, version=AGENT_VERSION)


class ExecuteRequest(BaseModel):
    session_id: int
    task_type: str
    capability: str
    input_payload: dict[str, Any] = Field(default_factory=dict)


@app.get("/health")
def health():
    return {"status": "ok", "agent_name": AGENT_NAME, "version": AGENT_VERSION}


@app.post("/execute")
def execute(payload: ExecuteRequest):
    start = time.perf_counter()
    if payload.capability != CAPABILITY:
        return error_response(
            payload.session_id,
            "UNSUPPORTED_CAPABILITY",
            f"Expected '{CAPABILITY}', got '{payload.capability}'",
        )

    product_name = payload.input_payload.get("product_name")
    product_title = payload.input_payload.get("product_title")
    if not isinstance(product_name, str) or not product_name.strip():
        return error_response(payload.session_id, "INVALID_INPUT", "Missing product_name")
    if not isinstance(product_title, str) or not product_title.strip():
        return error_response(payload.session_id, "INVALID_INPUT", "Missing product_title")

    tone = payload.input_payload.get("tone") or "modern, trustworthy, high-converting"
    output = _marketing(product_name.strip(), product_title.strip(), str(tone), payload)
    elapsed = (time.perf_counter() - start) * 1000
    return success_response(
        session_id=payload.session_id,
        agent_name=AGENT_NAME,
        capability=payload.capability,
        task_type=payload.task_type,
        output_payload=output,
        execution_time_ms=elapsed,
    )


def _marketing(
    product_name: str, product_title: str, tone: str, payload: dict[str, Any]
) -> dict[str, Any]:
    return {
        "ad_copy": [
            {
                "channel": "Meta Ads",
                "copy": (
                    f"No more bag leaks. {product_name} mixes smooth, cleans fast, "
                    f"and keeps up with your routine. Shop the launch — {tone.split(',')[0]}."
                ),
            },
            {
                "channel": "Google Ads",
                "copy": (
                    f"{product_title} | Leak-proof shaker cup. Free shipping on launch. "
                    "Smooth protein mixes. Order today."
                ),
            },
        ],
        "email_subjects": [
            f"Launch day: your new {product_name} is here",
            "Leak-proof shakes, zero gym-bag disasters",
            "The shaker built for gym bags and busy mornings",
        ],
        "launch_angle": (
            f"Position {product_name} as the trustworthy daily shaker for "
            f"{tone} fitness buyers who need reliability on the go."
        ),
        "source": "marketing-copy-agent-v1",
    }
