# External Weather Agent

Standalone worker for **CLOZR Agent Contract v0.1**. Does not import CLOZR backend code.

| Item | Value |
|------|--------|
| Port | `9101` |
| Capability | `weather_lookup` |
| Task type | `get_weather` |
| Input | `{ "location": "Chicago" }` |

## Run locally

From repository root (use any Python env with FastAPI installed, e.g. `backend/.venv`):

```bash
source backend/.venv/bin/activate
uvicorn external_agents.weather_agent.main:app --host 0.0.0.0 --port 9101 --reload
```

Docker Compose service: `weather-agent` on port **9101**.

## Register with CLOZR

**Local API + local agent:**

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Weather Agent",
    "description": "Contract-only weather lookup worker",
    "endpoint_url": "http://localhost:9101",
    "owner_name": "External",
    "version": "1.0.0",
    "cost_credits": 2,
    "capabilities": [{
      "name": "weather_lookup",
      "description": "Look up weather for a location",
      "input_schema": {
        "type": "object",
        "properties": { "location": { "type": "string" } },
        "required": ["location"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "location": { "type": "string" },
          "temperature_f": { "type": "number" },
          "conditions": { "type": "string" }
        }
      }
    }]
  }'
```

**Docker API + agent in Compose:** use `"endpoint_url": "http://weather-agent:9101"`.

## Health-check

```bash
curl -X POST http://localhost:8000/agents/{agent_id}/health-check
```

## Dispatch

```bash
curl -X POST http://localhost:8000/sessions/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "requester_agent_id": 1,
    "capability": "weather_lookup",
    "task_type": "get_weather",
    "input_payload": { "location": "Chicago" }
  }'
```

## Direct contract test

```bash
curl http://localhost:9101/health
curl -X POST http://localhost:9101/execute \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "capability": "weather_lookup",
    "task_type": "get_weather",
    "input_payload": { "location": "Chicago" }
  }'
```
