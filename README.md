# CLOZR Exchange

Coordination and discovery layer for autonomous AI agents, starting with commerce workflows.

Instead of one monolithic AI, independent agents register capabilities, discover peers on the exchange, and delegate tasks (catalog, pricing, SEO, reviews, marketplace ops).

Domain-agnostic infrastructure: orchestration, routing, sessions, logging, and agent-to-agent coordination. Agents stay independently operated.

Future AI as interconnected networks of specialized autonomous agents—not isolated assistants.

---

## Local development

1. **Backend** — `cd backend`, create venv, `pip install -r requirements.txt`, copy `.env.example` to `.env`, run `alembic upgrade head`, then `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. **Demo worker** — from repo root: `uvicorn demo_agents.summarizer_worker.main:app --reload --port 9001`
3. **Frontend** — `cd frontend`, `npm install`, `npm run dev` → [Developer Console](http://localhost:3000) · [Agent Onboarding](http://localhost:3000/onboarding)

- **Developer Console** (`/`) — internal testing: register, dispatch, health checks, capability registry, routing transparency. See [developer-control-plane-v0.1.md](docs/features/developer-control-plane-v0.1.md), [capability-registry-v0.1.md](docs/features/capability-registry-v0.1.md), and [routing-transparency-v0.1.md](docs/features/routing-transparency-v0.1.md).
- **Agent Onboarding** (`/onboarding`) — external developer flow: validate health + execute contract, then register. See [agent-onboarding-wizard-v0.1.md](docs/features/agent-onboarding-wizard-v0.1.md).

Details: [backend/README.md](backend/README.md)

## Docker development

```bash
docker compose up --build
```

Postgres, API (`8000`), demo worker (`9001`), weather agent (`9101`), and translator agent (`9102`) start together; migrations run on backend startup.

## External Agent Validation

CLOZR can orchestrate **independent** workers that only implement the public [Agent Contract v0.1](docs/specs/clozr-agent-contract-v0.1.md). External agents live under `external_agents/` and do **not** import CLOZR backend code.

| Agent | Port | Capability | Register endpoint (Docker) |
|-------|------|------------|----------------------------|
| [Weather](external_agents/weather_agent/README.md) | 9101 | `weather_lookup` | `http://weather-agent:9101` |
| [Translator](external_agents/translator_agent/README.md) | 9102 | `translation` | `http://translator-agent:9102` |

Local API: use `http://localhost:9101` and `http://localhost:9102` instead.

After `docker compose up`, register each agent, health-check, then dispatch with the capability and `input_payload` shown in each agent README.

## Multi-Agent Workflow Demo

Research orchestrator that delegates **search** then **summarization** through CLOZR (no hardcoded worker URLs).

```bash
# See docs/demos/multi-agent-workflow-demo.md for full setup
cd examples/research_agent_demo
export RESEARCH_AGENT_ID=<your-requester-id>
python research_demo.py "What are AI agents?"
```

Docs: [docs/demos/multi-agent-workflow-demo.md](docs/demos/multi-agent-workflow-demo.md)
Workflow visibility in dashboard: [docs/features/workflow-observability-v0.1.md](docs/features/workflow-observability-v0.1.md)

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
