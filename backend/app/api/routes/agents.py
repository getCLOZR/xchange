from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.agent import (
    AgentRegisterRequest,
    AgentResponse,
    AgentSearchResponse,
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
