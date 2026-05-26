from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import activity, agents, health, sessions
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.logging import setup_logging
from app.models import ActivityLog, Agent, Capability, Session  # noqa: F401

setup_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Domain-agnostic agent exchange for registration, discovery, and activity.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(activity.router)
app.include_router(sessions.router)
