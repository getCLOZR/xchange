"use client";

import { RefreshCw, Stethoscope, Users } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePoll } from "@/hooks/use-poll";
import {
  checkAgentHealth,
  checkAllAgentsHealth,
  getAgents,
  getApiErrorMessage,
} from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { Agent } from "@/types";

interface RegisteredAgentsPanelProps {
  refreshKey?: number;
}

export function RegisteredAgentsPanel({
  refreshKey = 0,
}: RegisteredAgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingAgentId, setCheckingAgentId] = useState<number | null>(null);

  const loadAgents = useCallback(async () => {
    setError(null);
    try {
      const data = await getAgents({ limit: 100 });
      setAgents(data.agents);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  usePoll(loadAgents, [refreshKey]);

  async function handleCheckAll() {
    setCheckingAll(true);
    setError(null);
    try {
      await checkAllAgentsHealth();
      await loadAgents();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleCheckOne(agentId: number) {
    setCheckingAgentId(agentId);
    setError(null);
    try {
      await checkAgentHealth(agentId);
      await loadAgents();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setCheckingAgentId(null);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Registered agents
          </CardTitle>
          <CardDescription>
            Agent registry with health and reliability metrics
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              loadAgents();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckAll}
            disabled={checkingAll}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {checkingAll ? "Checking..." : "Check All Health"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-amber-400/90 font-mono">{error}</p>}

        {!loading && agents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No agents loaded. Register agents via POST /agents/register (Swagger
            at /docs).
          </p>
        )}

        {agents.length > 0 && (
          <ul className="space-y-3">
            {agents.map((agent) => (
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
                  <div className="flex items-center gap-2">
                    <Badge variant={agent.is_active ? "success" : "muted"}>
                      {agent.is_active ? "active" : "inactive"}
                    </Badge>
                    <Badge variant={agent.is_healthy ? "success" : "warning"}>
                      {agent.is_healthy ? "healthy" : "unhealthy"}
                    </Badge>
                  </div>
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
                  <div>
                    <dt className="inline text-foreground/60">last health </dt>
                    <dd className="inline">
                      {agent.last_health_check
                        ? formatTimestamp(agent.last_health_check)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">last seen </dt>
                    <dd className="inline">
                      {agent.last_seen_at ? formatTimestamp(agent.last_seen_at) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">avg ms </dt>
                    <dd className="inline">
                      {agent.avg_response_time_ms != null
                        ? agent.avg_response_time_ms.toFixed(1)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/60">sessions </dt>
                    <dd className="inline">
                      {agent.total_sessions} / ok {agent.successful_sessions} / fail{" "}
                      {agent.failed_sessions}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {agent.capabilities.map((cap) => (
                    <Badge key={cap.id} variant="outline">
                      {cap.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckOne(agent.id)}
                  disabled={checkingAgentId === agent.id}
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  {checkingAgentId === agent.id ? "Checking..." : "Check Health"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
