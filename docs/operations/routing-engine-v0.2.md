# Routing Engine v0.2

Implemented routing improvements (current state only).

## Routing service

Module: `backend/app/services/routing_service.py`

Responsibilities:

- Find workers by capability
- Filter active + healthy workers (exclude requester)
- Compute deterministic routing scores
- Rank candidates
- Return selected worker and trace metadata

Dispatch (`session_service`) delegates worker selection to this service.

## Deterministic scoring

Per-worker score components:

| Component | Weight | Rule |
|-----------|--------|------|
| Success rate | 50% | `0.5` if `total_sessions == 0`, else `successful / total` |
| Latency | 25% | `0.5` if no avg latency; else min-max across candidate pool (or cap normalization) |
| Cost | 15% | Lower `cost_credits` scores higher; neutral `0.5` if missing |
| Health | 10% | `1.0` if healthy, `0.0` otherwise |

Formula:

```
score = success_rate_score * 0.50
      + latency_score * 0.25
      + cost_score * 0.15
      + health_score * 0.10
```

No LLM or semantic routing.

## Routing trace

`Session.routing_trace` (JSONB, nullable) stores:

- capability and filters applied
- ranked candidates with scores
- selected worker and reason
- failover `attempts` (per-worker outcomes)

Migration: `0002_session_routing_trace`

## Failover (synchronous)

On dispatch:

1. Rank all eligible workers
2. Try highest score first
3. On failure: log `task_failed_attempt`, update worker metrics, try next ranked worker
4. Session completes when any worker succeeds
5. Session fails when all ranked workers fail

No queues or background retries.

## Routing preview API

`GET /routing/preview?capability=...&requester_agent_id=...`

Returns ranked candidates and selection preview without creating a session.

## Multi-worker demo agents

Three summarizer workers for local routing tests:

| Worker | Port | Module |
|--------|------|--------|
| A | 9001 | `demo_agents.summarizer_worker_a.main` |
| B | 9002 | `demo_agents.summarizer_worker_b.main` |
| C | 9003 | `demo_agents.summarizer_worker_c.main` |

Legacy single worker remains at `demo_agents.summarizer_worker.main` (port 9001).

Failure modes in `input_payload`: `force_error`, `force_timeout`, `force_invalid_json`.

## Tests

`backend/tests/test_routing_engine.py` covers scoring, preview, ranking, unhealthy skip, failover, and all-workers-failed paths.
