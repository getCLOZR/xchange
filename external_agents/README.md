# External agents

Agents in this directory are **independent services**. They implement only the public [CLOZR Agent Contract v0.1](../docs/specs/clozr-agent-contract-v0.1.md):

- `GET /health`
- `POST /execute`

They do **not** import `backend/app` models, services, or schemas.

| Agent | Port | Capability | README |
|-------|------|------------|--------|
| Weather | 9101 | `weather_lookup` | [weather_agent/README.md](weather_agent/README.md) |
| Translator | 9102 | `translation` | [translator_agent/README.md](translator_agent/README.md) |
| Search | 9103 | `web_search` | [search_agent/README.md](search_agent/README.md) |

Use these to prove CLOZR can orchestrate third-party workers that only know the contract.
