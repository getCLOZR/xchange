"""Product Research Agent — CLOZR Agent Contract v0.1."""

import time
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from external_agents.ecommerce_common import error_response, success_response

AGENT_NAME = "Product Research Agent"
AGENT_VERSION = "1.0.0"
CAPABILITY = "product_research"
TASK_TYPE = "research_product"

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
    target_market = payload.input_payload.get("target_market")
    if not isinstance(product_name, str) or not product_name.strip():
        return error_response(payload.session_id, "INVALID_INPUT", "Missing product_name")
    if not isinstance(target_market, str) or not target_market.strip():
        return error_response(payload.session_id, "INVALID_INPUT", "Missing target_market")

    output = _research(product_name.strip(), target_market.strip())
    elapsed = (time.perf_counter() - start) * 1000
    return success_response(
        session_id=payload.session_id,
        agent_name=AGENT_NAME,
        capability=payload.capability,
        task_type=payload.task_type,
        output_payload=output,
        execution_time_ms=elapsed,
    )


def _research(product_name: str, target_market: str) -> dict[str, Any]:
    return {
        "market_summary": (
            f"{target_market} evaluating {product_name} prioritize quality, reliability, "
            f"clear differentiation, and day-to-day fit. Buyers compare options on features, "
            f"materials, ease of use, and value when choosing {product_name}."
        ),
        "competitors": [
            {
                "name": f"Premium {product_name} Co",
                "positioning": f"Higher-end {product_name} for quality-focused buyers",
                "price_range": "Premium",
            },
            {
                "name": f"Everyday {product_name}",
                "positioning": f"Accessible {product_name} for mainstream shoppers",
                "price_range": "Mid-range",
            },
            {
                "name": f"Value {product_name} Line",
                "positioning": f"Budget-friendly alternative in the {product_name} category",
                "price_range": "Value",
            },
        ],
        "customer_angles": [
            f"Clear benefits that matter to {target_market}",
            f"Differentiation vs typical {product_name} options",
            "Trust and quality signals that support purchase",
            "Ease of use in everyday routines",
            "Strong value relative to alternatives",
        ],
        "product_name": product_name,
        "target_market": target_market,
        "source": "product-research-agent-v1",
    }
