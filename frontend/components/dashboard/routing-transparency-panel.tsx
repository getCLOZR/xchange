"use client";

import { Eye, Search } from "lucide-react";
import { useCallback, useState } from "react";

import { RoutingExplanationView } from "@/components/dashboard/routing-explanation-view";
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
import type { RoutingExplanation } from "@/types";

export function RoutingTransparencyPanel() {
  const [capability, setCapability] = useState("summarization");
  const [requesterId, setRequesterId] = useState("");
  const [explanation, setExplanation] = useState<RoutingExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    if (!capability.trim()) {
      setError("Capability is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutingPreview(capability.trim(), {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Routing transparency
        </CardTitle>
        <CardDescription>
          Explain how CLOZR ranks workers — filters, exclusions, scores, and
          selection reason (no behavior changes)
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
            <Label htmlFor="transparency-cap">Capability</Label>
            <Input
              id="transparency-cap"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="summarization"
              className="font-mono text-sm"
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="transparency-req">Exclude requester id</Label>
            <Input
              id="transparency-req"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              placeholder="optional"
              className="font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={loading} size="sm">
            <Search className="h-3.5 w-3.5 mr-1" />
            {loading ? "Loading…" : "Explain routing"}
          </Button>
        </form>

        {error ? (
          <p className="text-xs text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-2">
            {error}
          </p>
        ) : null}

        {explanation ? (
          <RoutingExplanationView explanation={explanation} />
        ) : (
          !loading &&
          !error && (
            <p className="text-sm text-muted-foreground">
              Enter a capability and run Explain routing to see candidates,
              filters, and selection reasoning.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
