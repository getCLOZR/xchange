"use client";

import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Agent } from "@/types";

interface RegisteredAgentsPanelProps {
  /** Agents discovered via search this session (until GET /agents exists). */
  discoveredAgents: Agent[];
}

export function RegisteredAgentsPanel({
  discoveredAgents,
}: RegisteredAgentsPanelProps) {
  // TODO: replace with GET /agents when backend exposes list endpoint
  // const agents = await listAgents();

  const hasDiscovered = discoveredAgents.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Registered agents
        </CardTitle>
        <CardDescription>
          Agent registry on the exchange (capabilities, endpoints, versions)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-mono text-amber-400/90">
            TODO: integrate GET /agents — backend does not expose a list
            endpoint yet. Showing agents discovered via capability search this
            session only.
          </p>
        </div>

        {!hasDiscovered && (
          <p className="text-sm text-muted-foreground">
            No agents loaded. Use capability search below, or register agents
            via POST /agents/register (Swagger at /docs).
          </p>
        )}

        {hasDiscovered && (
          <ul className="space-y-3">
            {discoveredAgents.map((agent) => (
              <li
                key={agent.id}
                className="rounded-md border border-border bg-muted/20 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.description}
                    </p>
                  </div>
                  <Badge variant={agent.is_active ? "success" : "muted"}>
                    {agent.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
                <dl className="grid gap-1 text-xs font-mono text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="inline text-foreground/60">id </dt>
                    <dd className="inline">{agent.id}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">version </dt>
                    <dd className="inline">{agent.version}</dd>
                  </div>
                  <div className="sm:col-span-2 truncate">
                    <dt className="inline text-foreground/60">endpoint </dt>
                    <dd className="inline break-all">{agent.endpoint_url}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">owner </dt>
                    <dd className="inline">{agent.owner_name}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">credits </dt>
                    <dd className="inline">{agent.cost_credits}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {agent.capabilities.map((cap) => (
                    <Badge key={cap.id} variant="outline">
                      {cap.name}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
