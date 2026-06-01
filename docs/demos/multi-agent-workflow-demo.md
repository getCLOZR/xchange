# Multi-Agent Workflow Demo v0.1

Demonstrates the CLOZR thesis: a **higher-level agent** delegates work to **multiple specialized agents** through the exchange — without hardcoding worker dependencies.

## Agents involved

| Role | Type | Capability | Implementation |
|------|------|------------|----------------|
| Research Agent | Requester / orchestrator | `orchestration_client` | `examples/research_agent_demo/research_demo.py` |
| Search Agent | Worker | `web_search` | `external_agents/search_agent/` (port 9103) |
| Summarizer Agent | Worker | `summarization` | `demo_agents/summarizer_worker/` (port 9001) |

The research script only knows the CLOZR API and capability names — not search or summarizer URLs.

## Workflow

```
User Question
      ↓
Research Agent (orchestrator)
      ↓
CLOZR — dispatch web_search
      ↓
Search Agent → fake search results
      ↓
Research Agent — formats results as text
      ↓
CLOZR — dispatch summarization
      ↓
Summarizer Agent → summary
      ↓
Research Agent — final research brief
```

## Delegation path

1. `POST /sessions/dispatch` — `web_search` / `search_query` / `{ "query": "..." }`
2. CLOZR routes to a healthy search worker (scoring + trace + failover).
3. `POST /sessions/dispatch` — `summarization` / `summarize_text` / `{ "text": "..." }`
4. CLOZR routes to a healthy summarizer worker.

Two **sessions** appear in the dashboard:

- Session A: Research Agent → Search Agent  
- Session B: Research Agent → Summarizer Agent  

## CLOZR routing behavior

Each dispatch uses the existing routing engine:

- Filter active + healthy workers for the capability  
- Deterministic score (success rate, latency, cost, health)  
- `routing_trace` on the session  
- Failover if a worker returns contract errors or invalid responses  

## Activity log sequence

Typical order (newest first in `GET /activity`):

1. `workflow_completed` — orchestrator finished  
2. `task_completed` — summarizer session  
3. `worker_selected` / `task_dispatched` — summarizer  
4. `session_created` — summarizer session  
5. `task_completed` — search session  
6. `worker_selected` / `task_dispatched` — search  
7. `session_created` — search session  
8. `workflow_started` — orchestrator began  

## Setup

### 1. Start stack

```bash
docker compose up --build
```

Or run API + workers locally (see agent READMEs).

### 2. Register agents

**Research requester:**

```bash
curl -X POST http://localhost:8000/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Agent",
    "description": "Multi-agent research orchestrator",
    "endpoint_url": "http://localhost:8998",
    "owner_name": "Demo",
    "version": "1.0.0",
    "cost_credits": 0,
    "capabilities": [{
      "name": "orchestration_client",
      "description": "Client",
      "input_schema": {},
      "output_schema": {}
    }]
  }'
```

Note `id` → `export RESEARCH_AGENT_ID=<id>`.

**Search worker** (Docker: `http://search-agent:9103`, local: `http://localhost:9103`):

See [external_agents/search_agent/README.md](../../external_agents/search_agent/README.md).

**Summarizer** (Docker: `http://demo-worker:9001`, local: `http://localhost:9001`).

### 3. Health-check workers

```bash
curl -X POST http://localhost:8000/agents/health-check
```

### 4. Run demo

```bash
cd examples/research_agent_demo
source ../../backend/.venv/bin/activate
export RESEARCH_AGENT_ID=1
python research_demo.py "What are AI agents?"
```

## Example output

```json
{
  "question": "What are AI agents?",
  "sources_found": 3,
  "summary": "[Demo Summarizer Agent] Demo summary: 1. Overview: What are AI agents? ...",
  "workflow_status": "completed"
}
```

Plus a local `workflow_trace` with both session ids and statuses.

## Why this demonstrates the thesis

- **Specialization:** search and summarization are separate agents with separate capabilities.  
- **Dynamic delegation:** the research orchestrator chooses capabilities at runtime; CLOZR picks workers.  
- **Infrastructure, not monolith:** routing, sessions, traces, contract validation, and failover are all exchange concerns.  
- **No CLOZR imports in workers:** external search agent only implements the public contract.  

Intelligence is fake (deterministic demo data). The point is **orchestration and collaboration through CLOZR**.
