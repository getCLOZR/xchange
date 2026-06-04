"""Capability registry — group agents by capability for network discovery."""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.agent import Agent
from app.models.capability import Capability
from app.schemas.capability_registry import (
    CapabilityGroup,
    CapabilityProvider,
    CapabilityRegistryResponse,
)


def compute_success_rate(total_sessions: int, successful_sessions: int) -> float:
    if total_sessions <= 0:
        return 0.0
    return round(successful_sessions / total_sessions, 4)


def sort_providers(providers: list[CapabilityProvider]) -> list[CapabilityProvider]:
    """Healthy first, then highest success rate, then lowest latency."""
    return sorted(
        providers,
        key=lambda p: (
            not p.is_healthy,
            -p.success_rate,
            p.avg_response_time_ms
            if p.avg_response_time_ms is not None
            else float("inf"),
        ),
    )


def _provider_from_capability(cap: Capability) -> CapabilityProvider:
    agent: Agent = cap.agent
    total = agent.total_sessions or 0
    successful = agent.successful_sessions or 0
    failed = agent.failed_sessions or 0
    return CapabilityProvider(
        agent_id=agent.id,
        agent_name=agent.name,
        endpoint_url=agent.endpoint_url,
        is_active=agent.is_active,
        is_healthy=agent.is_healthy,
        cost_credits=agent.cost_credits,
        avg_response_time_ms=agent.avg_response_time_ms,
        total_sessions=total,
        successful_sessions=successful,
        failed_sessions=failed,
        success_rate=compute_success_rate(total, successful),
        input_schema=cap.input_schema or {},
        output_schema=cap.output_schema or {},
    )


def _build_groups(capabilities: list[Capability]) -> list[CapabilityGroup]:
    by_name: dict[str, list[CapabilityProvider]] = defaultdict(list)
    for cap in capabilities:
        by_name[cap.name].append(_provider_from_capability(cap))

    groups: list[CapabilityGroup] = []
    for name in sorted(by_name.keys()):
        providers = sort_providers(by_name[name])
        healthy_count = sum(1 for p in providers if p.is_healthy)
        groups.append(
            CapabilityGroup(
                name=name,
                provider_count=len(providers),
                healthy_provider_count=healthy_count,
                providers=providers,
            )
        )
    return groups


def list_capability_registry(db: Session) -> CapabilityRegistryResponse:
    """Return all capabilities grouped with provider metrics."""
    stmt = (
        select(Capability)
        .join(Agent, Capability.agent_id == Agent.id)
        .options(joinedload(Capability.agent))
        .order_by(Capability.name.asc(), Agent.id.asc())
    )
    capabilities = list(db.scalars(stmt).all())
    return CapabilityRegistryResponse(capabilities=_build_groups(capabilities))


def get_capability_group(db: Session, capability_name: str) -> Optional[CapabilityGroup]:
    """Return a single capability group or None if no providers exist."""
    stmt = (
        select(Capability)
        .join(Agent, Capability.agent_id == Agent.id)
        .where(Capability.name == capability_name)
        .options(joinedload(Capability.agent))
        .order_by(Agent.id.asc())
    )
    capabilities = list(db.scalars(stmt).all())
    if not capabilities:
        return None
    groups = _build_groups(capabilities)
    return groups[0] if groups else None
