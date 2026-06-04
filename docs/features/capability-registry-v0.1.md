# Capability Registry v0.1

Infrastructure observability and discovery for the CLOZR capability network.

Answers:

- What capabilities exist on the exchange?
- Which agents provide each capability?
- Which providers are healthy?
- Which provider would CLOZR likely route to?

This is **not** a marketplace (no billing, listings, ratings, or payments).

## API

### `GET /capabilities/`

Returns all capability groups, sorted alphabetically by name.

```json
{
  "capabilities": [
    {
      "name": "summarization",
      "provider_count": 3,
      "healthy_provider_count": 2,
      "providers": [
        {
          "agent_id": 6,
          "agent_name": "Demo Summarizer",
          "endpoint_url": "http://demo-worker:9001",
          "is_active": true,
          "is_healthy": true,
          "cost_credits": 1,
          "avg_response_time_ms": 9.4,
          "total_sessions": 10,
          "successful_sessions": 9,
          "failed_sessions": 1,
          "success_rate": 0.9,
          "input_schema": {},
          "output_schema": {}
        }
      ]
    }
  ]
}
```

### `GET /capabilities/{capability_name}`

Returns a single `CapabilityGroup` or `404` if no providers exist for that name.

## Grouping and metrics

- **Group key:** capability `name` (one group per distinct capability string).
- **Provider:** each `capabilities` table row joined to its agent.
- **success_rate:** `successful_sessions / total_sessions`, or `0.0` when `total_sessions` is 0.
- **Provider sort order:**
  1. Healthy providers first
  2. Higher `success_rate`
  3. Lower `avg_response_time_ms` (missing latency sorts last)

All providers are included (active and inactive).

## Routing preview

The dashboard does **not** duplicate routing logic. Capability detail view calls:

`GET /routing/preview?capability=<name>&requester_agent_id=` (optional)

Same endpoint and scoring as dispatch — see [routing-engine-v0.2.md](../operations/routing-engine-v0.2.md).

## Dashboard

**Developer Console** → **Capability registry** panel:

- Capability cards (name, provider count, healthy count, health ratio)
- Click a card for provider table, collapsible schemas, routing preview
- **Refresh** button; also reloads when `refreshKey` changes (e.g. after agent registration)

Empty states:

- No capabilities registered
- Capability with zero healthy providers
- Provider with no session metrics (`—` in table)
- Routing preview with no candidates

## Implementation

| Layer | Path |
|-------|------|
| Service | `backend/app/services/capability_registry_service.py` |
| Schemas | `backend/app/schemas/capability_registry.py` |
| Routes | `backend/app/api/routes/capabilities.py` |
| UI | `frontend/components/dashboard/capability-registry-panel.tsx` |
| Tests | `backend/tests/test_capability_registry.py` |

## Manual test

1. `docker compose up --build`
2. Register agents with different capabilities (onboarding or console)
3. Run bulk health check
4. Open Developer Console → Capability registry → **Refresh**
5. Click `summarization` (or other capability) → **Preview routing**
6. Compare ranked list with standalone Routing preview panel
