from typing import Any, Optional

from pydantic import BaseModel, Field


class EcommerceLaunchRequest(BaseModel):
    requester_agent_id: int = Field(..., ge=1)
    product_name: str = Field(..., min_length=1, max_length=255)
    target_market: str = Field(..., min_length=1, max_length=255)
    tone: str = Field(
        default="modern, trustworthy, high-converting",
        min_length=1,
        max_length=255,
    )


class EcommerceWorkflowStepTrace(BaseModel):
    step_index: int
    capability: str
    task_type: str
    session_id: Optional[int] = None
    worker_agent_id: Optional[int] = None
    status: str
    routing_summary: Optional[dict[str, Any]] = None
    execution_time_ms: Optional[float] = None
    output_preview: Optional[dict[str, Any]] = None


class EcommerceLaunchResponse(BaseModel):
    product_name: str
    target_market: str
    tone: str
    market_summary: Optional[str] = None
    competitors: list[dict[str, Any]] = Field(default_factory=list)
    customer_angles: list[str] = Field(default_factory=list)
    seo_keywords: list[str] = Field(default_factory=list)
    primary_keywords: list[str] = Field(default_factory=list)
    long_tail_keywords: list[str] = Field(default_factory=list)
    product_title: Optional[str] = None
    product_description: Optional[str] = None
    bullet_points: list[str] = Field(default_factory=list)
    meta_description: Optional[str] = None
    ad_copy: list[dict[str, Any]] = Field(default_factory=list)
    email_subjects: list[str] = Field(default_factory=list)
    launch_angle: Optional[str] = None
    workflow_status: str
    workflow_id: str
    workflow_trace: dict[str, Any] = Field(default_factory=dict)
