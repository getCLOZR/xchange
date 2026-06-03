# Developer Console UX v0.1

Internal dashboard tools for local testing and demos. Not a marketplace, agent builder, or customer-facing product UI.

## What you can do in the dashboard

| Action | Panel | API |
|--------|-------|-----|
| Register agent + capabilities | Register agent | `POST /agents/register` |
| Health check one / all | Registered agents | `POST /agents/{id}/health-check`, `POST /agents/health-check` |
| Preview routing | Routing preview | `GET /routing/preview?capability=` |
| Dispatch task | Dispatch task | `POST /sessions/dispatch` |
| Search by capability | Capability search | `GET /agents/search?capability=` |
| Inspect sessions | Orchestration sessions | `GET /sessions`, `GET /sessions/{id}` |
| Inspect workflows | Workflow activity | `GET /workflows/recent` |
| Read events | Activity log | `GET /activity` |

## Register agent from dashboard

1. Open http://localhost:3000 (with API on :8000).
2. Use **Register agent** or a **quick preset** (Demo Summarizer, Weather, Translator, Search).
3. Choose **localhost** or **Docker service** endpoint mode before applying a preset.
4. Edit capability JSON if needed (validated locally before submit).
5. Submit — agents list and activity log refresh automatically.

### Endpoint URLs

| Context | Example summarizer URL |
|---------|-------------------------|
| API + worker on host (terminal) | `http://localhost:9001` |
| API in Docker Compose | `http://demo-worker:9001` |

Same pattern for `weather-agent:9101`, `translator-agent:9102`, `search-agent:9103`.

## Health check from dashboard

- **Health check** on a single agent row — shows pass/fail and latency inline.
- **Check all health** — bulk check every active agent.

Run health checks after registration so routing and dispatch can select workers.

## Dispatch task from dashboard

1. Set **requester_agent_id** (defaults to last registered agent id).
2. Pick a **dispatch preset** or fill capability, task_type, and JSON payload.
3. Submit — view session id, status, worker, output, and errors in-panel.
4. Sessions, activity, and workflow panels refresh on success.

## Routing preview from dashboard

1. Enter a **capability** name.
2. Optionally set requester id to exclude from candidates.
3. **Preview routing** — ranked table with score, per-factor breakdown, filters, and selected worker preview.

Use this before dispatch to confirm a healthy worker exists.

## Activity log categories

Events are color-coded:

- **Registration** — `agent_registered`
- **Health** — `worker_health_check_*`
- **Routing** — `worker_selected`, `worker_selection_failed`
- **Dispatch** — session lifecycle events
- **Workflow** — `workflow_*`
- **Failure** — failed tasks, invalid responses, etc.

## Typical local flow (replaces curl)

1. `docker compose up` or start API + workers locally.
2. Dashboard → preset **Demo Summarizer** → Register → Health check.
3. Register a **requester** agent (any endpoint, e.g. same summarizer or a stub URL) or use an existing id.
4. Routing preview → `summarization` → confirm a candidate.
5. Dispatch preset **Summarization** with requester id.
6. Expand session row for payloads and routing trace.

## Related docs

- [Workflow observability v0.1](workflow-observability-v0.1.md)
- [Multi-agent workflow demo](../demos/multi-agent-workflow-demo.md)
- [Agent contract v0.1](../specs/clozr-agent-contract-v0.1.md)
