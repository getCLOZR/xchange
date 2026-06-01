# Research Agent Demo (orchestrator)

Requester-side demo: delegates **search** and **summarization** to specialized workers through CLOZR — no hardcoded worker URLs.

## Prerequisites

1. CLOZR API running (`http://localhost:8000`)
2. Workers running and registered:
   - Search agent (port 9103) — `web_search`
   - Summarizer (port 9001) — `summarization`
3. Research requester registered with `orchestration_client` capability

See [multi-agent workflow demo](../../docs/demos/multi-agent-workflow-demo.md) for full setup.

## Run

```bash
cd examples/research_agent_demo
source ../../backend/.venv/bin/activate
export RESEARCH_AGENT_ID=5   # your requester agent id
python research_demo.py "What are AI agents?"
```

Default question if omitted: `What are AI agents?`

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLOZR_API_URL` | `http://localhost:8000` | Exchange API base URL |
| `RESEARCH_AGENT_ID` | (required) | Registered research requester agent id |
