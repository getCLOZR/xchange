from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import activity, agents, health, routing, sessions, workflows
from app.core.config import get_settings
from app.core.logging import setup_logging

setup_logging()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Domain-agnostic agent exchange for registration, discovery, and activity.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(activity.router)
app.include_router(routing.router)
app.include_router(workflows.router)
app.include_router(sessions.router)
