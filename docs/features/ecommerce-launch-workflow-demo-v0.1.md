# Ecommerce Launch Workflow Demo v0.1

Proof-of-concept demo: one ecommerce product launch goal coordinated through CLOZR capability routing.

## Purpose

Show the CLOZR thesis:

1. One goal enters the network
2. CLOZR routes to specialized workers by capability
3. Each agent performs one step
4. CLOZR returns one combined launch package
5. Workflow, session, and routing traces prove coordination

Not a marketplace, billing system, or workflow builder.

## Capabilities

| Capability | Worker | Port (Docker) |
|------------|--------|---------------|
| `product_research` | Product Research Agent | 9201 |
| `seo_keywords` | SEO Keyword Agent | 9202 |
| `product_copy` | Product Copy Agent | 9203 |
| `marketing_copy` | Marketing Copy Agent | 9204 |

## Worker agents

Contract-only FastAPI workers under `external_agents/`:

- `product_research_agent/main.py`
- `seo_keyword_agent/main.py`
- `product_copy_agent/main.py`
- `marketing_copy_agent/main.py`

Deterministic demo output — no LLMs or external APIs.

## API

### `POST /workflows/ecommerce-launch`

```json
{
  "requester_agent_id": 1,
  "product_name": "Protein Shaker Bottle",
  "target_market": "US fitness customers",
  "tone": "modern, trustworthy, high-converting"
}
```

Behavior:

1. Creates `workflow_id` and logs workflow activity events
2. Dispatches each step via existing `dispatch_task` (routing + sessions)
3. Chains outputs between steps
4. Returns combined launch package + `workflow_trace`

Steps:

1. `product_research` → market summary, competitors, angles
2. `seo_keywords` → primary + long-tail keywords
3. `product_copy` → title, description, bullets, meta
4. `marketing_copy` → ads, email subjects, launch angle

## Frontend

Route: [http://localhost:3000/workflows/ecommerce-launch](http://localhost:3000/workflows/ecommerce-launch)

Customer-facing demo page (light app theme):

- Input form
- Execution timeline (4 steps)
- Polished launch package sections
- Collapsible technical details (workflow trace JSON)

## Docker Compose

Services (with host ports):

```yaml
product-research-agent:9201
seo-keyword-agent:9202
product-copy-agent:9203
marketing-copy-agent:9204
```

Internal URLs:

- `http://product-research-agent:9201`
- `http://seo-keyword-agent:9202`
- `http://product-copy-agent:9203`
- `http://marketing-copy-agent:9204`

## Registration

Use **Agent Onboarding** or **Developer Console** presets:

- Product Research Agent
- SEO Keyword Agent
- Product Copy Agent
- Marketing Copy Agent

Register a **requester** agent (any capability) for `requester_agent_id`.

Then run bulk health check.

## Manual test

1. `docker compose up --build`
2. Register four ecommerce workers (onboarding presets, Docker network URLs)
3. Register a requester agent (note its ID)
4. Health-check all agents
5. Confirm capabilities in **Network** or Capability Registry
6. Open `/workflows/ecommerce-launch`
7. Set requester agent ID → **Run Workflow**
8. Verify timeline, launch package, and technical details

## Tests

```bash
cd backend && pytest tests/test_ecommerce_launch_workflow.py -q
```
