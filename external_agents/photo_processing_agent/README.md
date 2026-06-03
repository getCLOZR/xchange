# External Photo Processing Agent

Standalone worker for **CLOZR Agent Contract v0.1**. Does not import CLOZR backend code.

| Item | Value |
|------|--------|
| Port | `9205` |
| Capability | `photo_processing` |
| Task type | `process_photo` |
| Input | `{ "image_url": "https://example.com/sample.jpg", "operation": "describe" }` |

## Run locally

From repository root (using an env with FastAPI/uvicorn, e.g. `backend/.venv`):

```bash
source backend/.venv/bin/activate
uvicorn external_agents.photo_processing_agent.main:app --host 0.0.0.0 --port 9205 --reload
```

Docker Compose service: `photo-processing-agent` on port **9205**.

## Register with CLOZR

**Docker API + agent in Compose:**

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Photo Processing Agent",
    "description": "Contract-only photo processing worker",
    "endpoint_url": "http://photo-processing-agent:9205",
    "owner_name": "External",
    "version": "1.0.0",
    "cost_credits": 3,
    "capabilities": [{
      "name": "photo_processing",
      "description": "Analyze and process photo metadata",
      "input_schema": {
        "type": "object",
        "properties": {
          "image_url": { "type": "string" },
          "operation": { "type": "string" }
        },
        "required": ["image_url"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "image_ref": { "type": "string" },
          "operation": { "type": "string" },
          "detected_objects": { "type": "array" },
          "quality_score": { "type": "number" }
        }
      }
    }]
  }'
```

For local backend + local worker, use `"endpoint_url": "http://localhost:9205"`.
