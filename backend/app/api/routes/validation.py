from fastapi import APIRouter

from app.schemas.validation import (
    ContractValidationRequest,
    ContractValidationResponse,
    EndpointValidationRequest,
    EndpointValidationResponse,
)
from app.services import validation_service

router = APIRouter(prefix="/validation", tags=["validation"])


@router.post("/endpoint", response_model=EndpointValidationResponse)
def validate_endpoint(payload: EndpointValidationRequest):
    """Validate worker /health reachability and CLOZR health contract."""
    result = validation_service.validate_endpoint(str(payload.endpoint_url))
    return EndpointValidationResponse(**result)


@router.post("/contract", response_model=ContractValidationResponse)
def validate_contract(payload: ContractValidationRequest):
    """Validate worker /execute contract compliance."""
    result = validation_service.validate_contract(str(payload.endpoint_url))
    return ContractValidationResponse(**result)
