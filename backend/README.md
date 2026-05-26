# CLOZR Exchange API

Domain-agnostic agent coordination API: registration, discovery, sessions, and task dispatch.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit DATABASE_URL if needed (Homebrew Mac: postgresql://YOUR_USER@localhost:5432/clozr_exchange)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health |
| POST | `/agents/register` | Register agent + capabilities |
| GET | `/agents/search?capability=` | Find agents by capability |
| GET | `/activity` | Recent activity logs |
| POST | `/sessions/dispatch` | Route task to worker and execute |
| GET | `/sessions` | List sessions (optional `status`, `capability`, `limit`) |
| GET | `/sessions/{session_id}` | Get one session |

Interactive docs: http://localhost:8000/docs

---

## Full orchestration test flow

Run **three terminals**: exchange API (8000), demo worker (9001), and curl (or use `/docs`).

### 1. Start exchange API

```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start demo summarizer worker

From repo root (install FastAPI in backend venv or any env with `fastapi` + `uvicorn`):

```bash
cd /path/to/xchange
source backend/.venv/bin/activate
uvicorn demo_agents.summarizer_worker.main:app --reload --host 0.0.0.0 --port 9001
```

Verify worker:

```bash
curl http://localhost:9001/health
```

### 3. Register a requester agent

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Requester Agent",
    "description": "Requests work from the exchange.",
    "endpoint_url": "http://localhost:8999",
    "owner_name": "CLOZR Demo",
    "version": "0.1.0",
    "cost_credits": 0,
    "capabilities": [
      {
        "name": "orchestration_client",
        "description": "Can request orchestration from the exchange.",
        "input_schema": {},
        "output_schema": {}
      }
    ]
  }'
```

Note the returned `"id"` (use as `requester_agent_id` below; often `1` on a fresh DB).

### 4. Register the demo summarizer worker

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Summarizer Agent",
    "description": "A demo worker agent that summarizes text.",
    "endpoint_url": "http://localhost:9001",
    "owner_name": "CLOZR Demo",
    "version": "0.1.0",
    "cost_credits": 1,
    "capabilities": [
      {
        "name": "summarization",
        "description": "Summarizes text input.",
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
            "result": { "type": "string" }
          }
        }
      }
    ]
  }'
```

### 5. Dispatch a task

Replace `1` with your requester agent id if different:

```bash
curl -X POST http://localhost:8000/sessions/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "requester_agent_id": 1,
    "capability": "summarization",
    "task_type": "summarize_text",
    "input_payload": {
      "text": "CLOZR Exchange is a domain-agnostic orchestration layer for AI agents that register capabilities, discover workers, and coordinate task execution through sessions and activity logs."
    }
  }'
```

Expected: `"status": "completed"` and `output_payload` with a demo summary.

### 6. Inspect session and activity

```bash
curl http://localhost:8000/sessions
curl http://localhost:8000/sessions/1
curl http://localhost:8000/activity
```

---

## Dispatch flow (synchronous)

1. Validate requester agent exists  
2. Find active worker with matching capability (excludes requester)  
3. Create session → log `session_created`, `worker_selected`  
4. Set `running` → log `task_dispatched`  
5. `POST {worker.endpoint_url}/execute` via httpx  
6. On success: `completed` + `output_payload` + log `task_completed`  
7. On failure: `failed` + `error_message` + log `task_failed`  

If no worker is available, a failed session is recorded and the API returns **404** with session details in the error body.
