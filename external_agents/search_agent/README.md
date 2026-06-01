# External Search Agent

Contract-only worker for the multi-agent research workflow demo.

| Item | Value |
|------|--------|
| Port | `9103` |
| Capability | `web_search` |
| Task type | `search_query` |
| Input | `{ "query": "What are AI agents?" }` |
| Output | `{ "results": [{ "title", "snippet", "source" }] }` |

## Run

```bash
source backend/.venv/bin/activate
uvicorn external_agents.search_agent.main:app --host 0.0.0.0 --port 9103 --reload
```

Docker: `search-agent` service on port **9103** — register as `http://search-agent:9103`.

## Register

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Search Agent",
    "description": "Demo web search worker for research workflow",
    "endpoint_url": "http://localhost:9103",
    "owner_name": "External",
    "version": "1.0.0",
    "cost_credits": 2,
    "capabilities": [{
      "name": "web_search",
      "description": "Search the web for information",
      "input_schema": {
        "type": "object",
        "properties": { "query": { "type": "string" } },
        "required": ["query"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "results": { "type": "array" }
        }
      }
    }]
  }'
```

Health-check and dispatch: see [multi-agent workflow demo](../../docs/demos/multi-agent-workflow-demo.md).
