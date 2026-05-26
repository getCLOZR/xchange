from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.agent import Agent
from app.models.capability import Capability
from app.schemas.agent import AgentRegisterRequest
from app.services.activity_service import log_activity


def register_agent(db: Session, payload: AgentRegisterRequest) -> Agent:
    """Register a new agent and its capabilities on the exchange."""
    agent = Agent(
        name=payload.name,
        description=payload.description,
        endpoint_url=str(payload.endpoint_url),
        owner_name=payload.owner_name,
        version=payload.version,
        cost_credits=payload.cost_credits,
        is_active=True,
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
