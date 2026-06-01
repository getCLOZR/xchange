# Production Foundation v0.1

Implemented infrastructure improvements (current state only).

## Centralized settings

- Module: `backend/app/core/config.py`
- Loader: `pydantic-settings`
- Template: `backend/.env.example`

All runtime configuration is read from environment variables (no hardcoded DB URL or worker timeout in application logic).

## Migration system

- Alembic config: `backend/alembic.ini`
- Environment hook: `backend/alembic/env.py` (uses `DATABASE_URL` from settings)
- Initial revision: `backend/alembic/versions/0001_initial_schema.py`

Official schema path:

```bash
cd backend
alembic upgrade head
```

## Dockerized local environment

- Compose file: `docker-compose.yml` (repo root)
- Backend image: `backend/Dockerfile`

Services:

| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5432 | Database |
| backend | 8000 | Exchange API |
| demo-worker | 9001 | Demo task executor |

## Automated testing

- Framework: `pytest`
- Config: `backend/pytest.ini`
- Tests: `backend/tests/test_orchestration_foundation.py`

Run:

```bash
cd backend
pytest
```

Tests validate core orchestration API behavior using route-level mocks (no external DB required for unit route tests).
