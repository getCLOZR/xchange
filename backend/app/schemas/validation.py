from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class EndpointValidationRequest(BaseModel):
    endpoint_url: HttpUrl


class EndpointValidationResponse(BaseModel):
    valid: bool
    agent_name: Optional[str] = None
    version: Optional[str] = None
    response_time_ms: Optional[float] = None
    error: Optional[str] = None


class ContractValidationRequest(BaseModel):
    endpoint_url: HttpUrl


class ContractValidationResponse(BaseModel):
    valid: bool
    execute_endpoint: bool = False
    response_contract: bool = False
    error_handling_valid: bool = False
    error: Optional[str] = None
    response_status: Optional[str] = None
