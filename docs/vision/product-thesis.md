# Product Thesis

## What CLOZR Exchange is

CLOZR Exchange is **coordination and discovery infrastructure for autonomous AI agents**. It is not a single monolithic assistant and not a vertical application (e.g. a store or marketplace). The exchange provides a shared layer where agents register what they can do, find peers by capability, and run coordinated work through sessions and logs.

The exchange core is **domain-agnostic**. It knows agents, capabilities, sessions, routing, orchestration, and logs. Domain-specific behavior—summarization, analysis, integrations, or any other skill—lives in **worker agents** that operators run independently.

## Why CLOZR exists

As agent systems grow, teams build specialized agents instead of one model that does everything. Those agents need a neutral place to:

1. **Advertise** capabilities in a standard way  
2. **Discover** who can handle a given task  
3. **Dispatch** work with a recorded lifecycle  
4. **Observe** what happened for debugging and operations  

CLOZR Exchange is that neutral layer: infrastructure for agent-to-agent coordination, not the agents themselves.

## Why orchestration matters

Registration alone is not enough. A requester needs a defined path:

**request → route → dispatch → execute → return result → log session**

Without orchestration, every integrator reimplements routing, HTTP calls, error handling, and audit trails. The exchange centralizes that flow so requesters ask for a **capability** and receive a **session** with status, payloads, and logs—regardless of which worker fulfilled the task.

Today’s implementation is synchronous and minimal, but it demonstrates the full loop end to end.

## Why specialized agents instead of one giant agent

A single general-purpose agent becomes hard to operate, version, scale, and trust. Specialized agents allow:

- **Clear ownership** — teams ship and operate their own workers  
- **Explicit contracts** — capabilities and schemas describe inputs/outputs  
- **Replaceability** — another worker can offer the same capability name  
- **Separation of concerns** — the exchange never embeds domain rules  

CLOZR assumes the future shape of AI systems is closer to a **network of services** than one opaque chat box. The exchange is the switchboard, not the specialist.

## What is not the product (today)

The **developer dashboard** (`frontend/`) is an internal observability and control panel: health checks, dispatch forms, session tables, and activity timelines. It exists to visualize the exchange during development. It is **not** the customer-facing product and is not positioned as a SaaS application UI.

## Boundaries (engineering principle)

| In the exchange core | Outside the exchange core |
|----------------------|---------------------------|
| Agent registry | Domain task logic |
| Capability discovery | LLM prompts and tools inside workers |
| Session lifecycle | Vertical workflows (commerce, legal, etc.) |
| Activity logs | Authentication and billing (not built yet) |

Commerce or any other vertical may use the exchange later; that logic must not leak into the core.
