from datetime import datetime
from time import perf_counter
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.agent import Agent
from app.models.capability import Capability
from app.schemas.agent import AgentHealthStatus, AgentRegisterRequest, HealthCheckResponse
from app.services.activity_service import log_activity
from app.services.contract_validation_service import validate_health_response

HEALTH_CHECK_TIMEOUT_SECONDS = 3.0


def register_agent(db: Session, payload: AgentRegisterRequest) -> Agent:
    """Register a new agent and its capabilities on the exchange."""
    agent = Agent(
        name=payload.name,
        description=payload.description,
        endpoint_url=str(payload.endpoint_url),
        owner_name=payload.owner_name,
        version=payload.version,
        cost_credits=payload.cost_credits,
        is_active=payload.is_active,
        is_healthy=False,
    )
    db.add(agent)
    db.flush()

    for cap in payload.capabilities:
        db.add(
            Capability(
                agent_id=agent.id,
                name=cap.name,
                description=cap.description,
                input_schema=cap.input_schema,
                output_schema=cap.output_schema,
            )
        )

    log_activity(
        db,
        event_type="agent_registered",
        message=f"{agent.name} registered on the exchange",
        agent_id=agent.id,
    )

    db.commit()
    return _load_agent_with_capabilities(db, agent.id)


def get_agent_by_id(db: Session, agent_id: int) -> Optional[Agent]:
    """Return an agent by primary key, or None if not found."""
    return db.get(Agent, agent_id)


def list_agents(
    db: Session,
    active: Optional[bool] = None,
    healthy: Optional[bool] = None,
    limit: int = 100,
) -> list[Agent]:
    stmt = select(Agent).options(selectinload(Agent.capabilities))
    if active is not None:
        stmt = stmt.where(Agent.is_active.is_(active))
    if healthy is not None:
        stmt = stmt.where(Agent.is_healthy.is_(healthy))
    stmt = stmt.order_by(Agent.created_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def search_agents_by_capability(db: Session, capability_name: str) -> list[Agent]:
    """Return active agents that offer the given capability name."""
    stmt = (
        select(Agent)
        .join(Capability, Agent.id == Capability.agent_id)
        .where(
            Agent.is_active.is_(True),
            Capability.name == capability_name,
        )
        .options(selectinload(Agent.capabilities))
        .distinct()
        .order_by(Agent.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def check_agent_health(db: Session, agent: Agent) -> HealthCheckResponse:
    checked_at = datetime.utcnow()
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    health_url = _health_url(agent.endpoint_url)

    try:
        start = perf_counter()
        with httpx.Client(timeout=HEALTH_CHECK_TIMEOUT_SECONDS) as client:
            response = client.get(health_url)
        response_time_ms = (perf_counter() - start) * 1000

        if response.status_code >= 400:
            raise RuntimeError(f"Health endpoint returned HTTP {response.status_code}")

        try:
            health_data = response.json()
        except ValueError as exc:
            raise RuntimeError("Health response was not valid JSON") from exc

        _, health_error = validate_health_response(health_data)
        if health_error:
            raise RuntimeError(health_error)

        agent.is_healthy = True
        agent.last_health_check = checked_at
        agent.last_seen_at = checked_at
        agent.avg_response_time_ms = response_time_ms
        log_activity(
            db,
            event_type="worker_health_check_passed",
            message=(
                f"Health check passed for agent '{agent.name}' (id={agent.id}) "
                f"in {response_time_ms:.1f}ms"
            ),
            agent_id=agent.id,
        )
    except httpx.TimeoutException:
        error_message = "Health check timed out"
        _mark_health_failed(db, agent, checked_at, error_message)
    except httpx.ConnectError:
        error_message = "Worker endpoint is unreachable"
        _mark_health_failed(db, agent, checked_at, error_message)
    except Exception as exc:
        error_message = str(exc)
        _mark_health_failed(db, agent, checked_at, error_message)

    return HealthCheckResponse(
        agent_id=agent.id,
        is_healthy=agent.is_healthy,
        response_time_ms=response_time_ms,
        checked_at=checked_at,
        error_message=error_message,
    )


def check_all_active_agents_health(db: Session) -> list[HealthCheckResponse]:
    stmt = select(Agent).where(Agent.is_active.is_(True)).order_by(Agent.id.asc())
    agents = list(db.scalars(stmt).all())
    results: list[HealthCheckResponse] = []
    for agent in agents:
        if not agent.endpoint_url:
            continue
        results.append(check_agent_health(db, agent))
    db.commit()
    return results


def to_agent_health_status(agent: Agent) -> AgentHealthStatus:
    return AgentHealthStatus(
        agent_id=agent.id,
        name=agent.name,
        endpoint_url=agent.endpoint_url,
        active=agent.is_active,
        is_healthy=agent.is_healthy,
        last_health_check=agent.last_health_check,
        last_seen_at=agent.last_seen_at,
        avg_response_time_ms=agent.avg_response_time_ms,
        total_sessions=agent.total_sessions,
        successful_sessions=agent.successful_sessions,
        failed_sessions=agent.failed_sessions,
    )


def _health_url(endpoint_url: str) -> str:
    return f"{endpoint_url.rstrip('/')}/health"


def _mark_health_failed(
    db: Session, agent: Agent, checked_at: datetime, error_message: str
) -> None:
    agent.is_healthy = False
    agent.last_health_check = checked_at
    log_activity(
        db,
        event_type="worker_health_check_failed",
        message=(
            f"Health check failed for agent '{agent.name}' (id={agent.id}): "
            f"{error_message}"
        ),
        agent_id=agent.id,
    )


def _load_agent_with_capabilities(db: Session, agent_id: int) -> Agent:
    stmt = (
        select(Agent)
        .where(Agent.id == agent_id)
        .options(selectinload(Agent.capabilities))
    )
    agent = db.scalar(stmt)
    if agent is None:
        raise ValueError(f"Agent {agent_id} not found")
    return agent
