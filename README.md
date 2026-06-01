# CLOZR Exchange

Coordination and discovery layer for autonomous AI agents, starting with commerce workflows.

Instead of one monolithic AI, independent agents register capabilities, discover peers on the exchange, and delegate tasks (catalog, pricing, SEO, reviews, marketplace ops).

Domain-agnostic infrastructure: orchestration, routing, sessions, logging, and agent-to-agent coordination. Agents stay independently operated.

Future AI as interconnected networks of specialized autonomous agents—not isolated assistants.

---

## Local development

1. **Backend** — `cd backend`, create venv, `pip install -r requirements.txt`, copy `.env.example` to `.env`, run `alembic upgrade head`, then `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. **Demo worker** — from repo root: `uvicorn demo_agents.summarizer_worker.main:app --reload --port 9001`
3. **Frontend** — `cd frontend`, `npm install`, `npm run dev`

Details: [backend/README.md](backend/README.md)

## Docker development

```bash
docker compose up --build
```

Postgres, API (`8000`), and demo worker (`9001`) start together; migrations run on backend startup.

## Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

## Alembic

From `backend/`:

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
alembic downgrade -1
```

---

## Backend & orchestration

See [backend/README.md](backend/README.md) for API setup, session dispatch (`POST /sessions/dispatch`), and the demo summarizer worker on port 9001.

## Documentation

Agent contract: [docs/specs/clozr-agent-contract-v0.1.md](docs/specs/clozr-agent-contract-v0.1.md).

Living engineering docs: [docs/architecture/current-architecture.md](docs/architecture/current-architecture.md), [docs/sequence-diagrams/orchestration-flow.md](docs/sequence-diagrams/orchestration-flow.md), [docs/milestones/current-state.md](docs/milestones/current-state.md), [docs/vision/product-thesis.md](docs/vision/product-thesis.md), [docs/operations/production-foundation-v0.1.md](docs/operations/production-foundation-v0.1.md), [docs/operations/routing-engine-v0.2.md](docs/operations/routing-engine-v0.2.md).

Backend setup (local, Docker, migrations, tests): [backend/README.md](backend/README.md).
