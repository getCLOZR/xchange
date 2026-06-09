"""Product Copy Agent — CLOZR Agent Contract v0.1."""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from external_agents.ecommerce_common import error_response, success_response

AGENT_NAME = "Product Copy Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "product_copy"
TASK_TYPE = "generate_product_copy"

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
    if not isinstance(product_name, str) or not product_name.strip():
        return error_response(payload.session_id, "INVALID_INPUT", "Missing product_name")

    output = _copy(product_name.strip(), payload.input_payload)
    elapsed = (time.perf_counter() - start) * 1000
    return success_response(
        session_id=payload.session_id,
        agent_name=AGENT_NAME,
        capability=payload.capability,
        task_type=payload.task_type,
        output_payload=output,
        execution_time_ms=elapsed,
    )


def _copy(product_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    keywords = payload.get("primary_keywords") or []
    kw_hint = keywords[0] if keywords else product_name.lower()
    title = f"{product_name} — Leak-Proof, Easy-Clean Shaker for Gym & Office"
    description = (
        f"Meet your new daily {product_name.lower()}: engineered for smooth protein "
        "mixes, zero leaks in your gym bag, and quick cleanup after busy mornings. "
        "BPA-free materials, a secure flip lid, and a mixing ball deliver clump-free "
        "shakes whether you're heading to the gym or the office."
    )
    return {
        "product_title": title,
        "product_description": description,
        "bullet_points": [
            "100% leak-proof flip lid — toss it in your bag with confidence",
            "BPA-free, odor-resistant bottle — fresh taste every shake",
            "Stainless mixing ball for smooth, clump-free protein blends",
            "Wide mouth and dishwasher-safe parts for fast cleaning",
            "Fits standard cup holders — built for gym, commute, and desk",
        ],
        "meta_description": (
            f"Shop the {product_name}: leak-proof, easy-clean shaker cup for "
            f"{kw_hint}. Smooth mixes, portable design, trusted materials."
        )[:160],
        "source": "product-copy-agent-v1",
    }
