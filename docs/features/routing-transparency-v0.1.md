# Routing Transparency v0.1

Explain CLOZR routing decisions without changing selection behavior or scoring weights.

## Questions answered

1. Which workers were considered?
2. Which workers were rejected (and why)?
3. Which worker was selected?
4. Why was it selected?
5. What happened during a workflow step?

## API

### `GET /routing/preview?capability=<name>&requester_agent_id=<id>`

Uses the same filter and rank logic as `POST /sessions/dispatch`. Returns:

| Field | Description |
|-------|-------------|
| `filters_applied` | e.g. `active=true`, `is_healthy=true`, `exclude_requester` |
| `candidate_count` | Eligible + excluded providers considered |
| `candidates` | Ranked eligible workers, then excluded workers |
| `selected_worker` | Preview winner (`agent_id`, `agent_name`) |
| `selection_reason` | Human-readable reason |

Each candidate includes:

- `eligible` — passed routing filters
- `rank` — routing order (eligible only)
- `score` / `score_breakdown` — actual weighted inputs (`success_rate_score`, `latency_score`, `cost_score`, `health_score`, `final_score`)
- `exclusion_reasons` / `exclusion_message` — when `eligible=false`

Backward-compatible fields: `filters`, `selected_agent_id`, `routing_trace`, `legacy_candidates`.

### `GET /sessions/{session_id}/routing`

Reconstructs routing explanation from `Session.routing_trace` (stored at dispatch). Includes:

- Same shape as preview
- `session_id`
- `dispatch_attempts` — failover outcomes when workers fail at execute time

Legacy sessions without `excluded_candidates` in the trace still return eligible candidates from the stored trace.

## Session trace storage

On dispatch, `routing_trace` JSONB now includes:

- `candidates` — eligible ranked workers
- `excluded_candidates` — filtered-out workers with reasons
- `candidate_count`
- `attempts` — updated during failover

Scoring weights unchanged (50% success, 25% latency, 15% cost, 10% health).

## Dashboard

| Section | Behavior |
|---------|----------|
| **Routing transparency** | Full explainer UI for any capability |
| **Routing preview** | Same shared `RoutingExplanationView` component |
| **Capability registry** | Preview routing per capability |
| **Sessions** | **View routing** opens modal via session routing API |
| **Workflow activity** | **Routing detail** per step with `session_id` |

## Manual test

1. Register two summarizers (one unhealthy), health-check the healthy one.
2. Developer Console → **Routing transparency** → capability `summarization` → **Explain routing**.
3. Confirm excluded worker shows `Excluded: unhealthy`.
4. Dispatch a task → Sessions → **View routing** on the new session.
5. Run `research_demo.py` → Workflow activity → expand workflow → **Routing detail** on each step.

## Out of scope

AI routing, semantic routing, marketplace ranking, reputation, bidding, or scoring changes.
