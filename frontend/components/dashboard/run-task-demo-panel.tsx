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
import {
  DEFAULT_DISPATCH_PAYLOAD,
  DISPATCH_PRESETS,
} from "@/lib/developer-presets";
import { dispatchTask, getApiErrorMessage } from "@/lib/api";
import { parseJsonField } from "@/lib/json-utils";
import { sessionStatusBadgeVariant } from "@/lib/session-utils";
import type { DispatchResponse } from "@/types";

interface RunTaskDemoPanelProps {
  onDispatchComplete?: () => void;
  defaultRequesterId?: string;
}

export function RunTaskDemoPanel({
  onDispatchComplete,
  defaultRequesterId = "1",
}: RunTaskDemoPanelProps) {
  const [requesterAgentId, setRequesterAgentId] = useState(defaultRequesterId);
  const [capability, setCapability] = useState("summarization");
  const [taskType, setTaskType] = useState("summarize_text");
  const [payload, setPayload] = useState(DEFAULT_DISPATCH_PAYLOAD);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DispatchResponse | null>(null);

  function applyPreset(presetId: string) {
    const preset = DISPATCH_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCapability(preset.capability);
    setTaskType(preset.task_type);
    setPayload(JSON.stringify(preset.input_payload, null, 2));
    setError(null);
    setLastResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastResult(null);

    const parsed = parseJsonField<Record<string, unknown>>(
      payload,
      "input_payload"
    );
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const requesterId = parseInt(requesterAgentId, 10);
    if (Number.isNaN(requesterId) || requesterId < 1) {
      setError("requester_agent_id must be a positive number");
      return;
    }
    if (!capability.trim()) {
      setError("capability is required");
      return;
    }
    if (!taskType.trim()) {
      setError("task_type is required");
      return;
    }

    setRunning(true);
    try {
      const result = await dispatchTask({
        requester_agent_id: requesterId,
        capability: capability.trim(),
        task_type: taskType.trim(),
        input_payload: parsed.value,
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
          POST /sessions/dispatch — synchronous orchestration test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick presets</p>
          <div className="flex flex-wrap gap-1.5">
            {DISPATCH_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

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
              className="font-mono text-[11px]"
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
              <p className="text-xs text-amber-400/90">
                {lastResult.error_message}
              </p>
            )}
            {lastResult.output_payload && (
              <pre className="text-[11px] font-mono overflow-x-auto max-h-28 rounded border border-border bg-background p-2">
                {JSON.stringify(lastResult.output_payload, null, 2)}
              </pre>
            )}
            {lastResult.routing_trace && (
              <pre className="text-[10px] font-mono overflow-x-auto max-h-24 rounded border border-border bg-background p-2 text-muted-foreground">
                {JSON.stringify(lastResult.routing_trace, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
