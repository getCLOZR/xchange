from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    settings = get_settings()
    mode = settings.worker_endpoint_mode.strip().lower()
    if mode not in {"local", "docker"}:
        mode = "local"
    return {
        "status": "ok",
        "service": "clozr-exchange-api",
        "worker_endpoint_mode": mode,
    }
