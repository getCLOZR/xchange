"use client";

import { Play } from "lucide-react";
import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { dispatchSessionTask, getApiErrorMessage } from "@/lib/api";
import { sessionStatusBadgeVariant } from "@/lib/session-utils";
import type { DispatchResponse } from "@/types";

const DEFAULT_PAYLOAD = `{
  "text": "CLOZR Exchange is a domain-agnostic orchestration layer for AI agents."
}`;

interface RunTaskDemoPanelProps {
  onDispatchComplete?: () => void;
}

export function RunTaskDemoPanel({ onDispatchComplete }: RunTaskDemoPanelProps) {
  const [requesterAgentId, setRequesterAgentId] = useState("1");
  const [capability, setCapability] = useState("summarization");
  const [taskType, setTaskType] = useState("summarize_text");
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DispatchResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    let input_payload: Record<string, unknown>;
    try {
      input_payload = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      setError("Invalid JSON in input_payload");
      return;
    }

    const requesterId = parseInt(requesterAgentId, 10);
    if (Number.isNaN(requesterId) || requesterId < 1) {
      setError("requester_agent_id must be a positive number");
      return;
    }

    setRunning(true);
    try {
      const result = await dispatchSessionTask({
        requester_agent_id: requesterId,
        capability: capability.trim(),
        task_type: taskType.trim(),
        input_payload,
      });
      setLastResult(result);
      onDispatchComplete?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          Dispatch task
        </CardTitle>
        <CardDescription>
          POST /sessions/dispatch — live orchestration through the exchange
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="requester">requester_agent_id</Label>
              <Input
                id="requester"
                value={requesterAgentId}
                onChange={(e) => setRequesterAgentId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capability">capability</Label>
              <Input
                id="capability"
                value={capability}
                onChange={(e) => setCapability(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-type">task_type</Label>
            <Input
              id="task-type"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payload">input_payload (JSON)</Label>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={5}
            />
          </div>
          <Button type="submit" disabled={running}>
            {running ? "Dispatching…" : "Dispatch task"}
          </Button>
        </form>

        {error && (
          <p className="text-xs text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-2">
            {error}
          </p>
        )}

        {lastResult && (
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Last dispatch result
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono">
                session #{lastResult.session_id}
              </span>
              <Badge variant={sessionStatusBadgeVariant(lastResult.status)}>
                {lastResult.status}
              </Badge>
              {lastResult.worker_agent_id != null && (
                <span className="text-xs font-mono text-muted-foreground">
                  worker {lastResult.worker_agent_id}
                </span>
              )}
            </div>
            {lastResult.error_message && (
              <p className="text-xs text-amber-400/90">{lastResult.error_message}</p>
            )}
            {lastResult.output_payload && (
              <pre className="text-[11px] font-mono overflow-x-auto max-h-28 rounded border border-border bg-background p-2">
                {JSON.stringify(lastResult.output_payload, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
