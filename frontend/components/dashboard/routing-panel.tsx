"use client";

import { GitBranch, RefreshCw, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, getRoutingPreview } from "@/lib/api";
import type { RoutingPreviewResponse } from "@/types";

export function RoutingPanel() {
  const [capability, setCapability] = useState("summarization");
  const [requesterId, setRequesterId] = useState("");
  const [preview, setPreview] = useState<RoutingPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    if (!capability.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutingPreview(capability.trim(), {
        requesterAgentId: requesterId ? Number(requesterId) : undefined,
      });
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [capability, requesterId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Routing engine
        </CardTitle>
        <CardDescription>
          GET /routing/preview — ranked healthy workers (deterministic scoring)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px] space-y-1">
            <label className="text-xs text-muted-foreground">Capability</label>
            <Input
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="summarization"
              className="font-mono text-sm"
            />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-xs text-muted-foreground">
              Exclude requester id
            </label>
            <Input
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              placeholder="optional"
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={runPreview} disabled={loading} size="sm">
            <Search className="h-3.5 w-3.5 mr-1" />
            Preview
            <RefreshCw
              className={`ml-1 h-3 w-3 ${loading ? "animate-spin" : "hidden"}`}
            />
          </Button>
        </div>

        {error && (
          <p className="text-xs text-amber-400/90 font-mono">{error}</p>
        )}

        {preview && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-muted-foreground">Filters:</span>
              {preview.filters.map((f) => (
                <Badge key={f} variant="outline" className="font-mono">
                  {f}
                </Badge>
              ))}
            </div>
            {preview.selected_agent_id != null && (
              <p className="font-mono text-foreground">
                Selected preview: agent {preview.selected_agent_id} —{" "}
                <span className="text-muted-foreground">
                  {preview.selection_reason}
                </span>
              </p>
            )}
            {preview.candidates.length === 0 ? (
              <p className="text-muted-foreground font-mono">
                No healthy active candidates for this capability.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2">Rank</th>
                      <th className="p-2">Agent</th>
                      <th className="p-2">Score</th>
                      <th className="p-2">Success %</th>
                      <th className="p-2">Latency ms</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.candidates.map((c, i) => (
                      <tr
                        key={c.agent_id}
                        className="border-t border-border/50 font-mono"
                      >
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">
                          {c.name}{" "}
                          <span className="text-muted-foreground">
                            #{c.agent_id}
                          </span>
                        </td>
                        <td className="p-2">{c.score.toFixed(3)}</td>
                        <td className="p-2">
                          {(c.success_rate * 100).toFixed(0)}%
                        </td>
                        <td className="p-2">
                          {c.avg_response_time_ms?.toFixed(1) ?? "—"}
                        </td>
                        <td className="p-2">{c.cost_credits}</td>
                        <td className="p-2">
                          <Badge
                            variant={c.is_healthy ? "default" : "destructive"}
                          >
                            {c.is_healthy ? "healthy" : "unhealthy"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
