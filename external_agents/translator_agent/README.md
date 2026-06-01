# External Translator Agent

Standalone worker for **CLOZR Agent Contract v0.1**. Does not import CLOZR backend code.

| Item | Value |
|------|--------|
| Port | `9102` |
| Capability | `translation` |
| Task type | `translate_text` |
| Input | `{ "text": "hello", "target_language": "Spanish" }` |

## Run locally

From repository root:

```bash
source backend/.venv/bin/activate
uvicorn external_agents.translator_agent.main:app --host 0.0.0.0 --port 9102 --reload
```

Docker Compose service: `translator-agent` on port **9102**.

## Register with CLOZR

**Local API + local agent:**

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Translator Agent",
    "description": "Contract-only translation worker",
    "endpoint_url": "http://localhost:9102",
    "owner_name": "External",
    "version": "1.0.0",
    "cost_credits": 1,
    "capabilities": [{
      "name": "translation",
      "description": "Translate text to a target language",
      "input_schema": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "target_language": { "type": "string" }
        },
        "required": ["text", "target_language"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "translated_text": { "type": "string" }
        }
      }
    }]
  }'
```

**Docker API + agent in Compose:** use `"endpoint_url": "http://translator-agent:9102"`.

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
    "capability": "translation",
    "task_type": "translate_text",
    "input_payload": { "text": "hello", "target_language": "Spanish" }
  }'
```

Demo pairs: `hello` + `Spanish` → `hola`, `hello` + `French` → `bonjour`.

## Direct contract test

```bash
curl http://localhost:9102/health
curl -X POST http://localhost:9102/execute \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "capability": "translation",
    "task_type": "translate_text",
    "input_payload": { "text": "hello", "target_language": "Spanish" }
  }'
```
