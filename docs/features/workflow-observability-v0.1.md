# Workflow Observability v0.1

Makes multi-agent workflow execution visible in the CLOZR Developer Dashboard without a workflow execution engine.

## Scope

Observability only:

- Workflow events in activity logs
- `GET /workflows/recent` API
- Dashboard **Workflow activity** panel
- Session linking from workflow steps

Not included: workflow definitions, DAG engine, builder, or background job runner.

## Workflow lifecycle

```
workflow_started
    → workflow_step_started (web_search)
    → [CLOZR dispatch → session A]
    → workflow_step_completed (web_search, session_id)
    → workflow_step_started (summarization)
    → [CLOZR dispatch → session B]
    → workflow_step_completed (summarization, session_id)
    → workflow_completed
```

On failure: `workflow_failed` is logged.

## Workflow event types

| Event | Purpose |
|-------|---------|
| `workflow_started` | Orchestrator begins a workflow |
| `workflow_step_started` | About to dispatch a capability |
| `workflow_step_completed` | Step finished with session id + status |
| `workflow_completed` | Entire workflow succeeded |
| `workflow_failed` | Workflow aborted |

Each event includes JSON `metadata` on the activity log:

- `workflow_id`
- `workflow_name` (e.g. `research_workflow`)
- `step_index` (1-based step order)
- `capability` (step events)
- `task_type` (step events)
- `session_id` (step completed)
- `worker_agent_id` (step completed)
- `status`
- `question` (research demo)

## Storage and reconstruction

- No separate `workflows` table.
- Metadata is stored on `activity_logs.metadata` (JSONB column).
- `workflow_service.list_recent_workflows()` groups events by `workflow_id` and builds step lists from `workflow_step_completed` entries.

## API

### `GET /workflows/recent?limit=20`

Returns reconstructed workflow traces:

```json
{
  "workflows": [
    {
      "workflow_id": "uuid",
      "workflow_name": "research_workflow",
      "status": "completed",
      "started_at": "...",
      "completed_at": "...",
      "question": "What are AI agents?",
      "steps": [
        {
          "step_index": 1,
          "capability": "web_search",
          "task_type": "search_query",
          "session_id": 6,
          "worker_agent_id": 9,
          "status": "completed"
        },
        {
          "step_index": 2,
          "capability": "summarization",
          "task_type": "summarize_text",
          "session_id": 7,
          "worker_agent_id": 12,
          "status": "completed"
        }
      ]
    }
  ],
  "count": 1
}
```

### `POST /activity/log`

Accepts optional `metadata` for workflow events (used by `research_demo.py`).

## Dashboard

### Workflow activity panel

- Lists recent workflows (5s polling with other panels)
- Expandable step timeline (`step_index`, `capability`, `task_type`, `session_id`, `worker_agent_id`, `status`)
- **View session →** jumps to orchestration sessions table (highlights row)
- **Copy session id** for quick inspection/debugging

### Activity timeline

Workflow events use violet styling to distinguish them from:

- Blue/primary — session orchestration (`task_dispatched`, etc.)
- Outline — health checks and other events

## Research demo integration

`examples/research_agent_demo/research_demo.py` emits all workflow events via `ClozrClient.log_workflow_event()`.

After running:

```bash
export RESEARCH_AGENT_ID=7
python research_demo.py "What are AI agents?"
```

Open http://localhost:3000 — workflow appears automatically within the poll interval.

## Migration

```bash
cd backend && alembic upgrade head
```

Adds `activity_logs.metadata` (revision `0003_activity_metadata`).
