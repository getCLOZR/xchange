# CLOZR Agent Contract v0.1

Standard interface every CLOZR-compatible **worker** agent must implement.

Domain-agnostic: the exchange routes tasks; workers execute them. This contract defines how workers expose capabilities and respond to orchestration.

## Lifecycle

```
Register on Exchange
    → Expose capabilities (via registration)
    → Respond to GET /health
    → Accept POST /execute
    → Return predictable success or error JSON
```

## Agent registration (Exchange API)

Workers register with the Exchange using `POST /agents/register`. Registration metadata should align with the agent descriptor below.

## Full contract example

```json
{
  "agent": {
    "name": "Summarizer A",
    "version": "1.0.0",
    "endpoint_url": "https://agent.example.com",
    "capabilities": [
      {
        "name": "summarization",
        "description": "Summarizes long-form text",
        "input_schema": {
          "type": "object",
          "properties": {
            "text": { "type": "string" }
          },
          "required": ["text"]
        },
        "output_schema": {
          "type": "object",
          "properties": {
            "summary": { "type": "string" }
          },
          "required": ["summary"]
        }
      }
    ]
  },
  "health_contract": {
    "request": {
      "method": "GET",
      "path": "/health"
    },
    "response": {
      "status": "ok",
      "agent_name": "Summarizer A",
      "version": "1.0.0"
    }
  },
  "execute_contract": {
    "request": {
      "session_id": 123,
      "capability": "summarization",
      "task_type": "summarize_text",
      "input_payload": {
        "text": "Long article content..."
      }
    },
    "success_response": {
      "status": "success",
      "session_id": 123,
      "agent_name": "Summarizer A",
      "capability": "summarization",
      "task_type": "summarize_text",
      "output_payload": {
        "summary": "Short summary..."
      },
      "execution_time_ms": 42
    },
    "error_response": {
      "status": "error",
      "session_id": 123,
      "error_code": "INVALID_INPUT",
      "message": "Missing required field: text",
      "details": {}
    }
  }
}
```

## GET /health

**Required response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Must be `"ok"` when healthy |
| `agent_name` | string | Human-readable worker name |
| `version` | string | Worker implementation version |

Non-2xx HTTP or missing required fields → health check fails on the Exchange.

## POST /execute

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `session_id` | integer | yes |
| `capability` | string | yes |
| `task_type` | string | yes |
| `input_payload` | object | yes |

### Success response (`status`: `"success"`)

| Field | Type | Required |
|-------|------|----------|
| `status` | string | `"success"` |
| `session_id` | integer | yes |
| `agent_name` | string | yes |
| `capability` | string | yes |
| `task_type` | string | yes |
| `output_payload` | object | yes |
| `execution_time_ms` | number | yes |

The Exchange stores `output_payload` on the session when dispatch succeeds.

### Error response (`status`: `"error"`)

| Field | Type | Required |
|-------|------|----------|
| `status` | string | `"error"` |
| `session_id` | integer | yes |
| `error_code` | string | yes |
| `message` | string | yes |
| `details` | object | yes (may be empty) |

The Exchange treats this as a failed attempt (failover may try the next ranked worker).

### Invalid responses

Responses that are not valid JSON, omit `status`, use an unknown `status`, or omit required fields for the declared status are **invalid**. The Exchange logs `invalid_worker_response` and continues failover when possible.

## Exchange behavior summary

| Worker response | Exchange action |
|-----------------|-----------------|
| `status: success` | Session completed; `output_payload` stored |
| `status: error` | Attempt failed; failover if more candidates |
| Invalid shape | Attempt failed; log `invalid_worker_response`; failover |
| HTTP / network error | Attempt failed; failover |

## Reference implementation

Demo workers under `demo_agents/` implement this contract. Schemas live in `backend/app/schemas/worker_contract.py`; validation in `backend/app/services/contract_validation_service.py`.
