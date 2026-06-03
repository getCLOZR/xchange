"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  RefreshCw,
} from "lucide-react";
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
import { getApiErrorMessage, getRecentWorkflows } from "@/lib/api";
import { workflowStatusBadgeVariant } from "@/lib/session-utils";
import { cn, formatTimestamp } from "@/lib/utils";
import type { WorkflowTrace } from "@/types";
import { CopyButton } from "@/components/dashboard/copy-button";

interface WorkflowActivityPanelProps {
  refreshKey?: number;
  onSelectSession?: (sessionId: number) => void;
}

function formatWorkflowName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function WorkflowActivityPanel({
  refreshKey = 0,
  onSelectSession,
}: WorkflowActivityPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setError(null);
    try {
      const data = await getRecentWorkflows(20);
      setWorkflows(data.workflows);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  usePoll(fetchWorkflows, [refreshKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-violet-400" />
            Workflow activity
          </CardTitle>
          <CardDescription>
            GET /workflows/recent — multi-agent workflows via activity logs
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchWorkflows();
          }}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-xs text-amber-400/90 font-mono">{error}</p>
        )}
        {!loading && workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No workflows yet. Run{" "}
            <code className="text-xs">python research_demo.py</code> to create
            one.
          </p>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => {
              const isOpen = expandedId === wf.workflow_id;
              return (
                <div
                  key={wf.workflow_id}
                  className="rounded-md border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full flex items-start gap-2 p-3 text-left hover:bg-muted/30 transition-colors",
                      isOpen && "bg-muted/20"
                    )}
                    onClick={() =>
                      setExpandedId(isOpen ? null : wf.workflow_id)
                    }
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatWorkflowName(wf.workflow_name)}
                        </span>
                        <Badge variant={workflowStatusBadgeVariant(wf.status)}>
                          {wf.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {wf.workflow_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        started {formatTimestamp(wf.started_at)}
                        {wf.completed_at
                          ? ` · completed ${formatTimestamp(wf.completed_at)}`
                          : ""}
                        {` · ${wf.steps.length} step${wf.steps.length === 1 ? "" : "s"}`}
                        {wf.question ? ` · ${wf.question}` : ""}
                      </p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-muted/10 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">
                        Workflow steps
                      </p>
                      <ol className="space-y-3">
                        {wf.steps.map((step, index) => (
                          <li key={`${step.step_index}-${step.capability}-${index}`} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-mono border",
                                  step.status === "completed"
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                    : "border-muted-foreground/40"
                                )}
                              >
                                {step.status === "completed" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  step.step_index
                                )}
                              </span>
                              {index < wf.steps.length - 1 && (
                                <span className="w-px flex-1 min-h-[16px] bg-border my-1" />
                              )}
                            </div>
                            <div className="pb-1 min-w-0 flex-1">
                              <p className="text-sm font-mono">
                                {step.step_index}. {step.capability}
                                {step.task_type ? ` (${step.task_type})` : ""}
                              </p>
                              {step.session_id != null ? (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Session {step.session_id}
                                  </span>
                                  <CopyButton
                                    value={String(step.session_id)}
                                    label="Copy session id"
                                  />
                                  {onSelectSession && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() =>
                                        onSelectSession(step.session_id!)
                                      }
                                    >
                                      View session →
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No session linked
                                </span>
                              )}
                              <Badge
                                variant={workflowStatusBadgeVariant(step.status)}
                                className="mt-1 text-[10px]"
                              >
                                {step.status}
                              </Badge>
                              {step.worker_agent_id != null && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  worker {step.worker_agent_id}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
