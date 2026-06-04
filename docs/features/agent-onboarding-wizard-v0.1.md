# Agent Onboarding Wizard v0.1

External developer flow to validate and register CLOZR-compatible agents **before** they join the exchange.

This is separate from the **Developer Console** (`/`), which remains the internal testing environment (dispatch, health checks, routing debug, workflow testing).

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Developer Console (unchanged) |
| `/onboarding` | Agent Onboarding wizard |

Platform navigation links both sections from the shared header.

## Onboarding flow

1. **Endpoint validation** — `POST /validation/endpoint` probes `GET {endpoint}/health`
2. **Contract validation** — `POST /validation/contract` probes `POST {endpoint}/execute`
3. **Agent configuration** — name, owner, version, cost, capabilities with JSON schemas
4. **Review** — summary of validations and configuration
5. **Register** — `POST /agents/register` (only after steps 1–2 pass)

Presets (Demo Summarizer, Weather, Translator, Search) auto-fill the endpoint and suggested metadata. The developer must still run both validation steps.

## Validation API

### `POST /validation/endpoint`

Request:

```json
{ "endpoint_url": "http://weather-agent:9101" }
```

Checks:

- TCP/HTTP reachability (10s timeout)
- HTTP 200 on `/health`
- JSON body
- CLOZR health fields: `status: "ok"`, `agent_name`, `version`

Response (success):

```json
{
  "valid": true,
  "agent_name": "External Weather Agent",
  "version": "1.0.0",
  "response_time_ms": 12.5,
  "error": null
}
```

Response (failure):

```json
{
  "valid": false,
  "agent_name": null,
  "version": null,
  "response_time_ms": null,
  "error": "Endpoint unreachable — verify URL and that the worker is running"
}
```

### `POST /validation/contract`

Request:

```json
{ "endpoint_url": "http://weather-agent:9101" }
```

Probe body sent to `/execute`:

```json
{
  "session_id": 0,
  "capability": "__validation__",
  "task_type": "__validation__",
  "input_payload": {}
}
```

Checks:

- `/execute` exists (not 404)
- JSON response
- Matches [CLOZR Agent Contract v0.1](../specs/clozr-agent-contract-v0.1.md) success **or** structured error shape

A structured error (e.g. `UNSUPPORTED_CAPABILITY`, `INVALID_INPUT`) counts as **valid** contract compliance.

Response (success):

```json
{
  "valid": true,
  "execute_endpoint": true,
  "response_contract": true,
  "error_handling_valid": true,
  "error": null,
  "response_status": "error"
}
```

## Registration

Uses existing `POST /agents/register` with the same payload as the Developer Console register panel.

Registration is gated in the UI until both validations return `valid: true`.

After success, open the Developer Console to health-check and dispatch tasks.

## Implementation

| Layer | Location |
|-------|----------|
| Service | `backend/app/services/validation_service.py` |
| Contract reuse | `backend/app/services/contract_validation_service.py` |
| Routes | `backend/app/api/routes/validation.py` |
| Schemas | `backend/app/schemas/validation.py` |
| UI | `frontend/app/onboarding/page.tsx`, `frontend/components/onboarding/agent-onboarding-wizard.tsx` |
| Tests | `backend/tests/test_validation_api.py` |

## Manual test

1. Start stack: `docker compose up --build`
2. Open http://localhost:3000/onboarding
3. Preset **External Weather**, mode **Docker network**
4. **Validate Endpoint** → expect PASS with agent name/version
5. **Next** → **Validate Execute Contract** → expect PASS (weather returns structured error for `__validation__`)
6. **Next** → confirm capabilities, **Next** → **Register Agent**
7. Open Developer Console → registered agents list → health-check

## Out of scope (v0.1)

Agent builder, workflow builder, marketplace, billing, trust scores, verification badges.
