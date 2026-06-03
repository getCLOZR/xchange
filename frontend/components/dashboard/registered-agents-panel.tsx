"use client";

import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Stethoscope,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";

import { CopyButton } from "@/components/dashboard/copy-button";
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
import type { Agent, HealthCheckResponse } from "@/types";

interface RegisteredAgentsPanelProps {
  refreshKey?: number;
  onHealthCheck?: () => void;
}

export function RegisteredAgentsPanel({
  refreshKey = 0,
  onHealthCheck,
}: RegisteredAgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingAgentId, setCheckingAgentId] = useState<number | null>(null);
  const [expandedCapsId, setExpandedCapsId] = useState<number | null>(null);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [lastHealthResults, setLastHealthResults] = useState<
    Record<number, HealthCheckResponse>
  >({});

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
    setBulkSummary(null);
    try {
      const bulk = await checkAllAgentsHealth();
      const byId: Record<number, HealthCheckResponse> = {};
      for (const r of bulk.results) {
        byId[r.agent_id] = r;
      }
      setLastHealthResults(byId);
      setBulkSummary(
        `Checked ${bulk.checked_count} agents: ${bulk.healthy_count} healthy, ${bulk.unhealthy_count} unhealthy`
      );
      await loadAgents();
      onHealthCheck?.();
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
      const result = await checkAgentHealth(agentId);
      setLastHealthResults((prev) => ({ ...prev, [agentId]: result }));
      await loadAgents();
      onHealthCheck?.();
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
            Registry with per-agent health checks and capability inspection
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
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckAll}
            disabled={checkingAll}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {checkingAll ? "Checking…" : "Check all health"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-xs text-amber-400/90 font-mono">{error}</p>
        )}
        {bulkSummary && (
          <p className="text-xs text-emerald-400/90 font-mono rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-1">
            {bulkSummary}
          </p>
        )}

        {!loading && agents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No agents registered. Use the Register agent panel or a quick preset.
          </p>
        )}

        {agents.length > 0 && (
          <ul className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {agents.map((agent) => {
              const healthResult = lastHealthResults[agent.id];
              const capsOpen = expandedCapsId === agent.id;
              return (
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
                      <Badge
                        variant={agent.is_healthy ? "success" : "warning"}
                      >
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
                    <div className="sm:col-span-2 break-all">
                      <dt className="inline text-foreground/60">endpoint </dt>
                      <dd className="inline">{agent.endpoint_url}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/60">last_health </dt>
                      <dd className="inline">{agent.last_health_check ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/60">avg_ms </dt>
                      <dd className="inline">
                        {agent.avg_response_time_ms != null
                          ? agent.avg_response_time_ms.toFixed(1)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/60">sessions </dt>
                      <dd className="inline">{agent.total_sessions}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/60">ok/fail </dt>
                      <dd className="inline">
                        {agent.successful_sessions}/{agent.failed_sessions}
                      </dd>
                    </div>
                  </dl>

                  {healthResult && (
                    <p
                      className={`text-xs font-mono rounded border px-2 py-1 ${
                        healthResult.is_healthy
                          ? "border-emerald-500/30 text-emerald-400/90"
                          : "border-amber-500/30 text-amber-400/90"
                      }`}
                    >
                      Health check:{" "}
                      {healthResult.is_healthy ? "passed" : "failed"}
                      {healthResult.response_time_ms != null &&
                        ` (${healthResult.response_time_ms.toFixed(0)} ms)`}
                      {healthResult.error_message &&
                        ` — ${healthResult.error_message}`}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap.id} variant="outline">
                        {cap.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheckOne(agent.id)}
                      disabled={checkingAgentId === agent.id}
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      {checkingAgentId === agent.id
                        ? "Checking…"
                        : "Health check"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedCapsId(capsOpen ? null : agent.id)
                      }
                    >
                      {capsOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      Capabilities
                    </Button>
                    <CopyButton
                      value={String(agent.id)}
                      label="Copy ID"
                    />
                    <CopyButton
                      value={agent.endpoint_url}
                      label="Copy endpoint"
                    />
                  </div>

                  {capsOpen && (
                    <div className="space-y-2 pt-1">
                      {agent.capabilities.map((cap) => (
                        <div
                          key={cap.id}
                          className="rounded border border-border bg-background/50 p-2 space-y-1"
                        >
                          <p className="text-xs font-medium">{cap.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {cap.description}
                          </p>
                          <pre className="text-[10px] font-mono overflow-x-auto max-h-24 rounded border border-border p-1.5">
                            {JSON.stringify(
                              {
                                input_schema: cap.input_schema,
                                output_schema: cap.output_schema,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
