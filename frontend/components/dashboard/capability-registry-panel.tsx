"use client";

import { GitBranch, Layers, RefreshCw } from "lucide-react";
import { RoutingExplanationView } from "@/components/dashboard/routing-explanation-view";
import { useCallback, useEffect, useState } from "react";

import { CollapsibleBlock } from "@/components/dashboard/collapsible-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getApiErrorMessage,
  getCapabilities,
  getRoutingPreview,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CapabilityGroup, CapabilityProvider, RoutingExplanation } from "@/types";

interface CapabilityRegistryPanelProps {
  refreshKey?: number;
}

function healthRatio(group: CapabilityGroup): string {
  if (group.provider_count === 0) return "—";
  return `${group.healthy_provider_count}/${group.provider_count}`;
}

function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  return `${ms.toFixed(1)} ms`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function SchemaBlock({ title, schema }: { title: string; schema: Record<string, unknown> }) {
  return (
    <CollapsibleBlock title={title} defaultOpen={false}>
      <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </CollapsibleBlock>
  );
}

function RoutingPreviewBlock({ capability }: { capability: string }) {
  const [requesterId, setRequesterId] = useState("");
  const [explanation, setExplanation] = useState<RoutingExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutingPreview(capability, {
        requesterAgentId: requesterId ? Number(requesterId) : undefined,
      });
      setExplanation(data);
    } catch (e) {
      setExplanation(null);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [capability, requesterId]);

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
      <p className="text-xs font-medium flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        Routing preview
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-36 space-y-1">
          <Label className="text-xs">Exclude requester id</Label>
          <Input
            value={requesterId}
            onChange={(e) => setRequesterId(e.target.value)}
            placeholder="optional"
            className="h-8 font-mono text-xs"
          />
        </div>
        <Button type="button" size="sm" disabled={loading} onClick={() => void runPreview()}>
          {loading ? "Loading…" : "Preview routing"}
        </Button>
      </div>
      {error ? <p className="text-xs text-amber-400/90 font-mono">{error}</p> : null}
      {explanation ? (
        <RoutingExplanationView explanation={explanation} showSummary={false} />
      ) : null}
    </div>
  );
}

function ProviderTable({ providers }: { providers: CapabilityProvider[] }) {
  if (providers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No providers registered for this capability.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Agent</th>
            <th className="p-2">Active</th>
            <th className="p-2">Healthy</th>
            <th className="p-2">Success</th>
            <th className="p-2">Latency</th>
            <th className="p-2">Cost</th>
            <th className="p-2">Sessions</th>
            <th className="p-2">Failed</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {providers.map((p) => (
            <tr key={p.agent_id} className="border-t border-border/50">
              <td className="p-2">{p.agent_id}</td>
              <td className="p-2">{p.agent_name}</td>
              <td className="p-2">{p.is_active ? "yes" : "no"}</td>
              <td className="p-2">
                <Badge variant={p.is_healthy ? "success" : "warning"}>
                  {p.is_healthy ? "yes" : "no"}
                </Badge>
              </td>
              <td className="p-2">
                {p.total_sessions > 0 ? formatRate(p.success_rate) : "—"}
              </td>
              <td className="p-2">{formatLatency(p.avg_response_time_ms)}</td>
              <td className="p-2">{p.cost_credits}</td>
              <td className="p-2">{p.total_sessions}</td>
              <td className="p-2">{p.failed_sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CapabilityRegistryPanel({
  refreshKey = 0,
}: CapabilityRegistryPanelProps) {
  const [groups, setGroups] = useState<CapabilityGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCapabilities();
      setGroups(data.capabilities);
      setSelected((prev) =>
        prev && !data.capabilities.some((g) => g.name === prev) ? null : prev
      );
    } catch (e) {
      setGroups([]);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const selectedGroup = groups.find((g) => g.name === selected) ?? null;
  const sampleProvider = selectedGroup?.providers[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Capability registry
          </CardTitle>
          <CardDescription>
            Network-wide capability discovery — providers, health, and routing
            preview
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-xs text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-2">
            {error}
          </p>
        ) : null}

        {loading && groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading capabilities…</p>
        ) : null}

        {!loading && groups.length === 0 && !error ? (
          <p className="text-sm text-muted-foreground">
            No capabilities registered yet. Register agents with capabilities from
            the Developer Console or Agent Onboarding.
          </p>
        ) : null}

        {groups.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Capabilities ({groups.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {groups.map((group) => {
                  const isSelected = selected === group.name;
                  const noHealthy = group.healthy_provider_count === 0;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => setSelected(group.name)}
                      className={cn(
                        "rounded-md border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <p className="font-mono text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {group.provider_count} provider
                        {group.provider_count === 1 ? "" : "s"} ·{" "}
                        <span
                          className={cn(
                            noHealthy && group.provider_count > 0
                              ? "text-amber-400"
                              : "text-emerald-400/90"
                          )}
                        >
                          {group.healthy_provider_count} healthy
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Health ratio {healthRatio(group)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0">
              {!selectedGroup ? (
                <p className="text-sm text-muted-foreground">
                  Select a capability to view providers, schemas, and routing
                  preview.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-mono text-base font-semibold">
                      {selectedGroup.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedGroup.provider_count} providers ·{" "}
                      {selectedGroup.healthy_provider_count} healthy
                    </p>
                    {selectedGroup.healthy_provider_count === 0 &&
                    selectedGroup.provider_count > 0 ? (
                      <p className="text-xs text-amber-400/90 mt-2">
                        No healthy providers currently available for this
                        capability. Run health checks on registered workers.
                      </p>
                    ) : null}
                  </div>

                  <ProviderTable providers={selectedGroup.providers} />

                  {sampleProvider ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <SchemaBlock
                        title="input_schema (first provider)"
                        schema={sampleProvider.input_schema}
                      />
                      <SchemaBlock
                        title="output_schema (first provider)"
                        schema={sampleProvider.output_schema}
                      />
                    </div>
                  ) : null}

                  <RoutingPreviewBlock capability={selectedGroup.name} />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
