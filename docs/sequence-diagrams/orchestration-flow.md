# Orchestration Flow

This sequence reflects the **current synchronous** implementation of `POST /sessions/dispatch`. There is no background queue; the HTTP client waits until the worker responds or times out (30s worker timeout via httpx).

## End-to-end sequence

```mermaid
sequenceDiagram
  autonumber
  participant R as Requester agent
  participant X as CLOZR Exchange API
  participant DB as PostgreSQL
  participant W as Worker agent

  R->>X: POST /sessions/dispatch<br/>requester_agent_id, capability,<br/>task_type, input_payload

  X->>DB: Load requester agent
  alt Requester not found
    X-->>R: 404
  end

  X->>DB: Search active agents by capability
  alt No worker available
    X->>DB: Create session (failed)
    X->>DB: Log task_failed
    X-->>R: 404 + session detail
  end

  X->>DB: Create session (pending)
  X->>DB: Log session_created
  X->>DB: Log worker_selected

  X->>DB: Update session (running)
  X->>DB: Log task_dispatched

  X->>W: POST /execute<br/>session_id, task_type,<br/>capability, input_payload

  alt Worker success
    W-->>X: 200 JSON output
    X->>DB: Update session (completed,<br/>output_payload, completed_at)
    X->>DB: Log task_completed
    X-->>R: DispatchResponse (completed)
  else Worker error or timeout
    W-->>X: Error / non-2xx
    X->>DB: Update session (failed,<br/>error_message, completed_at)
    X->>DB: Log task_failed
    X-->>R: DispatchResponse (failed)
  end
```

## Session status transitions

```mermaid
stateDiagram-v2
  [*] --> pending: Session created
  pending --> running: Worker selected, dispatch starts
  running --> completed: Worker returns success
  running --> failed: Worker error or HTTP failure
  pending --> failed: No worker found (edge case)
```

Statuses in use today: `pending`, `running`, `completed`, `failed`.

## Activity log events (orchestration)

| Event | When |
|-------|------|
| `session_created` | Session row created after worker match |
| `worker_selected` | Worker agent chosen for capability |
| `task_dispatched` | HTTP call to worker `/execute` begins |
| `task_completed` | Worker response stored successfully |
| `task_failed` | No worker, worker error, or dispatch failure |

Registration uses a separate event: `agent_registered`.

## Demo path (local)

1. Exchange API on port **8000**
2. Demo summarizer worker on port **9001** (`demo_agents/summarizer_worker`)
3. Register requester + worker via `POST /agents/register`
4. Dispatch via API or developer dashboard

The demo worker returns deterministic fake output (no LLM call).
