# Current System State

Snapshot of what is **implemented and runnable today**. This document is updated as the codebase changes—not a roadmap.

## Backend (Exchange API)

**Stack:** Python 3.9+, FastAPI, PostgreSQL, SQLAlchemy, Pydantic, Uvicorn, httpx, python-dotenv

### Implemented

- [x] Health check (`GET /health`)
- [x] Agent registration with nested capabilities (`POST /agents/register`)
- [x] Capability-based agent search (`GET /agents/search`)
- [x] Activity log read API (`GET /activity`)
- [x] Session model persisted in PostgreSQL
- [x] Synchronous task dispatch (`POST /sessions/dispatch`)
- [x] Session list and detail (`GET /sessions`, `GET /sessions/{id}`)
- [x] Worker HTTP invocation (`POST {endpoint}/execute`)
- [x] Lifecycle activity logging for sessions
- [x] CORS for local developer dashboard

### Not implemented

- Authentication / authorization
- Payments or billing
- Rate limits
- Reputation scoring
- Job queues (Celery, Redis, etc.)
- `GET /agents` (list all agents)
- Async or webhook-based dispatch
- Alembic migrations (schema via `create_all` on startup)

## Database tables

| Table | Purpose |
|-------|---------|
| `agents` | Registered agents |
| `capabilities` | Capabilities per agent |
| `sessions` | Orchestration runs |
| `activity_logs` | Exchange events |

## Demo worker

**Location:** `demo_agents/summarizer_worker/`

- `GET /health`
- `POST /execute` — returns fake summarization JSON (no external AI)

Used to prove request → route → execute → result without domain logic in the exchange.

## Frontend (developer dashboard)

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Axios

**Purpose:** Internal control panel for observability and manual testing—not the product surface.

### Implemented panels

- Health / API connectivity
- Registered agents (from capability search until list API exists)
- Capability search (live)
- Task dispatch (live `POST /sessions/dispatch`)
- Sessions table with expandable detail (live, 5s poll)
- Activity log timeline (live, 5s poll)

### Not implemented in frontend

- End-user product UI
- Authentication
- WebSockets
- Production deployment config

## Documentation

- `backend/README.md` — API setup and curl examples
- `frontend/README.md` — dashboard setup
- `docs/` — architecture and engineering notes (this tree)

## How to run (current)

See `backend/README.md` for:

1. Start PostgreSQL database `clozr_exchange`
2. Start exchange API on port 8000
3. Start demo worker on port 9001
4. Register agents and dispatch a session

Dashboard: `cd frontend && npm run dev` → http://localhost:3000
