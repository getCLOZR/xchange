# Current Architecture

CLOZR Exchange is **domain-agnostic AI agent coordination infrastructure**.

## System components

| Component | Role |
|-----------|------|
| Exchange API | Registry, health checks, routing, sessions, activity logs |
| PostgreSQL | Persistent state |
| Alembic | Schema migrations |
| Demo worker | External task executor (`/health`, `/execute`) |
| Developer dashboard | Internal observability UI |
| Docker Compose | Optional local infrastructure stack |

## Configuration

All runtime settings are loaded from environment variables through `app/core/config.py`:

- `APP_NAME`, `ENVIRONMENT`
- `DATABASE_URL`
- `BACKEND_HOST`, `BACKEND_PORT`
- `WORKER_HTTP_TIMEOUT_SECONDS`
- `CORS_ORIGINS`
- `LOG_LEVEL`

## Schema management

Database schema is managed by Alembic migrations in `backend/alembic/versions/`.

The API does **not** rely on `Base.metadata.create_all()` at startup.

## Routing engine (v0.2)

- Service: `routing_service.py` — deterministic scoring and ranking
- Trace: `Session.routing_trace` (JSONB)
- Failover: synchronous retry on next ranked healthy worker
- Preview: `GET /routing/preview?capability=...`

## API surface

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/agents/register` |
| GET | `/agents` |
| GET | `/agents/search` |
| POST | `/agents/health-check` |
| POST | `/agents/{id}/health-check` |
| GET | `/routing/preview` |
| GET | `/activity` |
| POST | `/sessions/dispatch` |
| GET | `/sessions` |
| GET | `/sessions/{id}` |

## Local infrastructure (Docker)

`docker-compose.yml` provides:

1. `postgres`
2. `backend` (migrations + API)
3. `demo-worker`

## Testing

`backend/tests/` contains pytest coverage for core orchestration routes and failure paths.

## Operational notes

- Dispatch is synchronous.
- Routing requires healthy active workers.
- Worker reliability metrics are updated after dispatch.
- For existing local DBs created before Alembic, use migration/reset guidance in `backend/README.md`.
