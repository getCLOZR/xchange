from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.agent import (
    AgentListResponse,
    AgentRegisterRequest,
    AgentResponse,
    AgentSearchResponse,
    BulkHealthCheckResponse,
    HealthCheckResponse,
)
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/register", response_model=AgentResponse, status_code=201)
def register_agent(
    payload: AgentRegisterRequest,
    db: Session = Depends(get_db),
):
    agent = agent_service.register_agent(db, payload)
    return agent


@router.get("/search", response_model=AgentSearchResponse)
def search_agents(
    capability: str = Query(..., min_length=1, description="Capability name to match"),
    db: Session = Depends(get_db),
):
    agents = agent_service.search_agents_by_capability(db, capability)
    return AgentSearchResponse(agents=agents, count=len(agents))


@router.get("", response_model=AgentListResponse)
def list_agents(
    active: Optional[bool] = Query(default=None),
    healthy: Optional[bool] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    agents = agent_service.list_agents(db, active=active, healthy=healthy, limit=limit)
    return AgentListResponse(agents=agents, count=len(agents))


@router.post("/health-check", response_model=BulkHealthCheckResponse)
def health_check_all_agents(
    db: Session = Depends(get_db),
):
    results = agent_service.check_all_active_agents_health(db)
    healthy_count = len([r for r in results if r.is_healthy])
    unhealthy_count = len(results) - healthy_count
    return BulkHealthCheckResponse(
        checked_count=len(results),
        healthy_count=healthy_count,
        unhealthy_count=unhealthy_count,
        results=results,
    )


@router.post("/{agent_id}/health-check", response_model=HealthCheckResponse)
def health_check_agent(
    agent_id: int,
    db: Session = Depends(get_db),
):
    agent = agent_service.get_agent_by_id(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    result = agent_service.check_agent_health(db, agent)
    db.commit()
    return result
