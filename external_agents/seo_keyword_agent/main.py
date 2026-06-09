"""SEO Keyword Agent — CLOZR Agent Contract v0.1."""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from external_agents.ecommerce_common import error_response, success_response

AGENT_NAME = "SEO Keyword Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "seo_keywords"
TASK_TYPE = "generate_seo_keywords"

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

    output = _keywords(product_name.strip(), payload.input_payload)
    elapsed = (time.perf_counter() - start) * 1000
    return success_response(
        session_id=payload.session_id,
        agent_name=AGENT_NAME,
        capability=payload.capability,
        task_type=payload.task_type,
        output_payload=output,
        execution_time_ms=elapsed,
    )


def _keywords(product_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    slug = product_name.lower().replace(" ", " ")
    return {
        "primary_keywords": [
            slug,
            f"leak proof {slug}",
            f"gym {slug.split()[0] if slug.split() else 'fitness'} cup",
            f"{slug} for protein powder",
        ],
        "long_tail_keywords": [
            f"best {slug} for gym and office",
            f"BPA free {slug} easy to clean",
            f"{slug} with mixing ball reviews",
            f"portable protein shaker for commuters",
        ],
        "search_intent": "Commercial — shoppers comparing features before purchase",
        "seo_angle": (
            "Lead with leak-proof durability and easy cleaning for fitness commuters"
        ),
        "source": "seo-keyword-agent-v1",
    }
