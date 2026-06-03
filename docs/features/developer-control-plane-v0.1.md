# Developer Control Plane v0.1

Internal dashboard upgrades that make CLOZR practical for day-to-day testing and demos without relying on curl commands.

This is a technical control plane for developers, not a marketplace or customer app.

## Control plane capabilities

- Register agents with one or more capabilities
- Run single-agent and bulk health checks
- Dispatch tasks with JSON payloads
- Preview routing decisions before dispatch
- Inspect session payloads and routing traces
- Inspect workflow traces (`/workflows/recent`)
- Review categorized activity logs

## Register agent from dashboard

Use the **Register agent** panel:

1. Fill `name`, `description`, `endpoint_url`, `owner_name`, `version`, `cost_credits`, and `active`.
2. Add one or more capability blocks with:
   - `name`
   - `description`
   - `input_schema` (JSON)
   - `output_schema` (JSON)
3. Submit to call `POST /agents/register`.

Validation:

- Capability JSON is parsed client-side before submit.
- Clear field-specific JSON parse errors are shown inline.
- On success, agents and activity refresh.

## Presets

Quick-fill registration presets include:

- Demo Summarizer
- External Weather Agent
- External Translator Agent
- External Search Agent

Dispatch presets include:

- Summarization
- Weather
- Translation
- Search
- Failure test

## Health-check agents

From **Registered agents** panel:

- **Health check** (per row) calls `POST /agents/{id}/health-check`
- **Check all health** calls `POST /agents/health-check`

The panel surfaces pass/fail, latency, and bulk-check summary.

## Dispatch tasks

From **Dispatch task** panel:

1. Enter `requester_agent_id`, `capability`, `task_type`, `input_payload`.
2. Submit to call `POST /sessions/dispatch`.
3. Review session id, status, selected worker, output payload, errors, and raw trace snippets.

On dispatch, sessions/activity/workflows refresh.

## Routing preview

Use **Routing preview** panel:

- Input capability (and optional requester id exclusion)
- Calls `GET /routing/preview`
- Shows ranked candidates, selected worker preview, score, score breakdown, health, latency, cost, success rate, and applied filters

## Session inspector

Expanded session rows show:

- Session metadata and timestamps
- Formatted `input_payload` and `output_payload`
- `error_message`
- Structured routing trace (selected worker, candidates, attempts/failover)
- Raw routing trace JSON in a collapsible block

## Workflow activity

If available, workflow visibility comes from `GET /workflows/recent`:

- workflow id, name, status, created time
- steps with status and linked sessions

This is observability only (no workflow engine).

## Localhost vs Docker endpoints

- Use `localhost` endpoints when backend/workers run directly on host.
- Use Docker service-name endpoints when backend runs inside Compose.

Examples:

- Local: `http://localhost:9001`
- Docker: `http://demo-worker:9001`

Apply same pattern for weather/translator/search agents.

## Replaces common curl workflows

Common local tasks now supported in UI:

- Agent registration
- Capability definition
- Health checks
- Dispatch
- Routing preview
- Session trace inspection
- Workflow/activity inspection
