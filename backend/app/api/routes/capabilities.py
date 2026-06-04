from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.capability_registry import CapabilityGroup, CapabilityRegistryResponse
from app.services import capability_registry_service

router = APIRouter(prefix="/capabilities", tags=["capabilities"])


@router.get("/", response_model=CapabilityRegistryResponse)
def list_capabilities(db: Session = Depends(get_db)):
    """List all capabilities on the exchange grouped by name with providers."""
    return capability_registry_service.list_capability_registry(db)


@router.get("/{capability_name}", response_model=CapabilityGroup)
def get_capability(capability_name: str, db: Session = Depends(get_db)):
    """Return one capability group with all providers."""
    group = capability_registry_service.get_capability_group(db, capability_name)
    if group is None:
        raise HTTPException(
            status_code=404,
            detail=f"No providers registered for capability '{capability_name}'",
        )
    return group
