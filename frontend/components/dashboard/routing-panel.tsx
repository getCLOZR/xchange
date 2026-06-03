"use client";

import { GitBranch, Search } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { getApiErrorMessage, getRoutingPreview } from "@/lib/api";
import type { RoutingPreviewResponse } from "@/types";

export function RoutingPanel() {
  const [capability, setCapability] = useState("summarization");
  const [requesterId, setRequesterId] = useState("");
  const [preview, setPreview] = useState<RoutingPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    if (!capability.trim()) {
      setError("capability is required");
      return;
    }
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
          Routing preview
        </CardTitle>
        <CardDescription>
          GET /routing/preview — see ranked workers before dispatch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void runPreview();
          }}
        >
          <div className="flex-1 min-w-[160px] space-y-1.5">
            <Label htmlFor="routing-cap">capability</Label>
            <Input
              id="routing-cap"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="summarization"
              className="font-mono text-sm"
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="routing-req">requester id (optional)</Label>
            <Input
              id="routing-req"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              placeholder="exclude"
              className="font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={loading} size="sm">
            <Search className="h-3.5 w-3.5 mr-1" />
            {loading ? "Loading…" : "Preview routing"}
          </Button>
        </form>

        {error && (
          <p className="text-xs text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-2">
            {error}
          </p>
        )}

        {preview && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-muted-foreground">Filters applied:</span>
              {preview.filters.length === 0 ? (
                <span className="font-mono text-muted-foreground">none</span>
              ) : (
                preview.filters.map((f) => (
                  <Badge key={f} variant="outline" className="font-mono">
                    {f}
                  </Badge>
                ))
              )}
            </div>
            {preview.selected_agent_id != null ? (
              <p className="font-mono text-foreground rounded border border-border bg-muted/20 p-2">
                Selected preview: agent {preview.selected_agent_id} —{" "}
                <span className="text-muted-foreground">
                  {preview.selection_reason}
                </span>
              </p>
            ) : (
              <p className="font-mono text-amber-400/90">
                No worker selected — register and health-check workers for this
                capability.
              </p>
            )}
            {preview.candidates.length === 0 ? (
              <p className="text-muted-foreground font-mono">
                No healthy active candidates for &quot;{preview.capability}&quot;.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2">Rank</th>
                      <th className="p-2">Agent</th>
                      <th className="p-2">Score</th>
                      <th className="p-2">Breakdown</th>
                      <th className="p-2">Success %</th>
                      <th className="p-2">Latency</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.candidates.map((c, i) => (
                      <tr
                        key={c.agent_id}
                        className="border-t border-border/50 font-mono align-top"
                      >
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">
                          {c.name}
                          <span className="text-muted-foreground">
                            {" "}
                            #{c.agent_id}
                          </span>
                        </td>
                        <td className="p-2">{c.score.toFixed(3)}</td>
                        <td className="p-2 text-[10px] text-muted-foreground max-w-[200px]">
                          {Object.entries(c.score_breakdown).map(([k, v]) => (
                            <span key={k} className="block">
                              {k}: {typeof v === "number" ? v.toFixed(3) : v}
                            </span>
                          ))}
                        </td>
                        <td className="p-2">
                          {(c.success_rate * 100).toFixed(0)}%
                        </td>
                        <td className="p-2">
                          {c.avg_response_time_ms?.toFixed(1) ?? "—"}
                        </td>
                        <td className="p-2">{c.cost_credits}</td>
                        <td className="p-2">
                          <Badge
                            variant={c.is_healthy ? "success" : "warning"}
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
