# Gleam — Developer Dashboard

Internal control panel for visualizing exchange infrastructure: agents, capabilities, orchestration flow, and activity logs.

**Not** a production SaaS UI — developer tooling only.

## Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:8000` (see `../backend`)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

## Panels

| Panel | Backend | Notes |
|-------|---------|-------|
| Health | `GET /health` | Live |
| Registered agents | `GET /agents` | **TODO** — shows agents from capability search this session |
| Capability search | `GET /agents/search` | Live |
| Dispatch task | `POST /sessions/dispatch` | Live |
| Sessions | `GET /sessions`, `GET /sessions/{id}` | Live (5s poll) |
| Activity log | `GET /activity` | Live (5s poll) |

## Project structure

```
app/              # Next.js App Router
components/       # Dashboard + shadcn/ui
lib/api.ts        # Axios client
types/            # TypeScript types
```

## Backend CORS

The FastAPI app allows `localhost:3000`. Restart uvicorn after pulling backend changes.
