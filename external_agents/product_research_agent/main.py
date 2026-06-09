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
            f"{target_market} evaluating {product_name} prioritize durability, leak-proof "
            "design, easy cleaning, and portability for gym bags and office commutes. "
            "Buyers compare shaker cups on mixability, BPA-free materials, and value for "
            "daily protein routines."
        ),
        "competitors": [
            {
                "name": "HydraMix Pro",
                "positioning": "Premium leak-proof shaker for serious lifters",
                "price_range": "$24–$32",
            },
            {
                "name": "FitBlend Classic",
                "positioning": "Affordable everyday gym shaker",
                "price_range": "$12–$18",
            },
            {
                "name": "CleanShake Elite",
                "positioning": "Easy-clean design for busy professionals",
                "price_range": "$19–$26",
            },
        ],
        "customer_angles": [
            "Leak-proof lid for gym bags and commutes",
            "Smooth mixing without clumps",
            "Dishwasher-safe, odor-resistant materials",
            "Compact size that fits cup holders",
            "Trustworthy brand for daily health routines",
        ],
        "product_name": product_name,
        "target_market": target_market,
        "source": "product-research-agent-v1",
    }
