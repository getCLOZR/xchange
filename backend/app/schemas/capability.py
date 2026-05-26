from pydantic import BaseModel, Field


class CapabilityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    input_schema: dict = Field(default_factory=dict)
    output_schema: dict = Field(default_factory=dict)


class CapabilityResponse(BaseModel):
    id: int
    name: str
    description: str
    input_schema: dict
    output_schema: dict

    model_config = {"from_attributes": True}
