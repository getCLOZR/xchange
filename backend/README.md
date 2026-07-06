# Gleam Exchange API

Domain-agnostic agent coordination API: registration, discovery, orchestration sessions, worker health checks, and activity logs.

## Configuration

Runtime settings are centralized in `app/core/config.py` using `pydantic-settings`.

Copy and edit environment file:

```bash
cp .env.example .env
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `APP_NAME` | API display name |
| `ENVIRONMENT` | Runtime environment label |
| `DATABASE_URL` | PostgreSQL connection string |
| `BACKEND_HOST` | Uvicorn bind host |
| `BACKEND_PORT` | Uvicorn bind port |
| `WORKER_HTTP_TIMEOUT_SECONDS` | Worker `/execute` HTTP timeout |
| `CORS_ORIGINS` | Comma-separated allowed dashboard origins |
| `LOG_LEVEL` | Python log level |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health |
| POST | `/agents/register` | Register agent + capabilities |
| GET | `/agents` | List agents with reliability fields |
| GET | `/agents/search?capability=` | Capability search |
| POST | `/agents/{agent_id}/health-check` | Check one worker health |
| POST | `/agents/health-check` | Check all active agents |
| GET | `/activity` | Recent activity logs |
| POST | `/sessions/dispatch` | Route + dispatch task |
| GET | `/sessions` | List sessions |
| GET | `/sessions/{session_id}` | Session detail |
| GET | `/routing/preview?capability=` | Ranked routing preview (no session) |

Interactive docs: http://localhost:8000/docs

Worker contract: [docs/specs/clozr-agent-contract-v0.1.md](../docs/specs/clozr-agent-contract-v0.1.md)

### Multi-worker demo (routing v0.2)

Run three summarizer workers (from repo root, with backend venv):

```bash
source backend/.venv/bin/activate
uvicorn demo_agents.summarizer_worker_a.main:app --reload --port 9001
uvicorn demo_agents.summarizer_worker_b.main:app --reload --port 9002
uvicorn demo_agents.summarizer_worker_c.main:app --reload --port 9003
```

Register each on different ports with capability `summarization`, run health checks, then use `/routing/preview` or dispatch.

---

## Local development

### 1) Install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 2) Run migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### 3) Start backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4) Start demo worker

```bash
cd /path/to/xchange
source backend/.venv/bin/activate
uvicorn demo_agents.summarizer_worker.main:app --reload --host 0.0.0.0 --port 9001
```

### 5) Start frontend dashboard

```bash
cd frontend
npm install
npm run dev
```

---

## Docker development

From repository root:

```bash
docker compose up --build
```

Services:

- `postgres` on `5432`
- `backend` on `8000` (runs `alembic upgrade head` before API start)
- `demo-worker` on `9001`

Run migrations manually if needed:

```bash
docker compose exec backend alembic upgrade head
```

---

## Testing

From `backend/`:

```bash
source .venv/bin/activate
pytest
```

Tests cover:

- health endpoint
- agent registration
- capability search
- worker health check route
- dispatch success path
- dispatch failure when no healthy worker exists

---

## Alembic

Run from `backend/`:

```bash
# create migration (after model changes)
alembic revision --autogenerate -m "describe change"

# apply migrations
alembic upgrade head

# rollback one revision
alembic downgrade -1
```

Schema evolution is managed by Alembic. The API no longer uses `create_all()` on startup.

---

## Existing local databases

If your DB was created before reliability fields or before Alembic:

**Option A (recommended for local dev reset):**

```bash
dropdb clozr_exchange
createdb clozr_exchange
cd backend && source .venv/bin/activate && alembic upgrade head
```

**Option B (keep data, add missing columns manually):**

```sql
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS is_healthy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_health_check timestamp NULL,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS avg_response_time_ms double precision NULL,
  ADD COLUMN IF NOT EXISTS total_sessions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_sessions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_sessions integer NOT NULL DEFAULT 0;
```

Then stamp/align Alembic revision state as needed.

---

## Reliability test flow

1. Start backend and demo worker
2. Register requester + summarizer worker
3. `POST /agents/health-check`
4. `POST /sessions/dispatch` (expect success)
5. Stop demo worker
6. `POST /agents/health-check` again
7. Dispatch again (expect failed session: no healthy worker)
