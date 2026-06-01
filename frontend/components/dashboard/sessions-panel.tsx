"use client";

import { ChevronDown, ChevronRight, Layers, RefreshCw } from "lucide-react";
import { Fragment, useCallback, useState } from "react";

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
import { getApiErrorMessage, getSession, getSessions } from "@/lib/api";
import { sessionStatusBadgeVariant } from "@/lib/session-utils";
import { cn, formatTimestamp } from "@/lib/utils";
import type { RoutingTrace, Session } from "@/types";

interface SessionsPanelProps {
  refreshKey?: number;
}

export function SessionsPanel({ refreshKey = 0 }: SessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setError(null);
    try {
      const data = await getSessions({ limit: 50 });
      setSessions(data.sessions);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  usePoll(fetchSessions, [refreshKey]);

  async function toggleExpand(sessionId: number) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(sessionId);
    setDetailLoading(true);
    try {
      const full = await getSession(sessionId);
      setDetail(full);
    } catch (e) {
      setDetail(null);
      setError(getApiErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Orchestration sessions
          </CardTitle>
          <CardDescription>
            GET /sessions — request → route → execute → result
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchSessions();
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
        <div className="overflow-x-auto rounded-md border border-border max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-[1]">
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-2 w-8" />
                <th className="p-2 font-medium">ID</th>
                <th className="p-2 font-medium">Capability</th>
                <th className="p-2 font-medium">Task</th>
                <th className="p-2 font-medium">Requester</th>
                <th className="p-2 font-medium">Worker</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Created</th>
                <th className="p-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No orchestration sessions yet.
                  </td>
                </tr>
              )}
              {sessions.map((session) => {
                const isOpen = expandedId === session.id;
                return (
                  <Fragment key={session.id}>
                    <tr
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/20 cursor-pointer",
                        isOpen && "bg-muted/30"
                      )}
                      onClick={() => toggleExpand(session.id)}
                    >
                      <td className="p-2 text-muted-foreground">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="p-2 font-mono">{session.id}</td>
                      <td className="p-2 font-mono">{session.capability}</td>
                      <td className="p-2 font-mono">{session.task_type}</td>
                      <td className="p-2 font-mono">
                        {session.requester_agent_id}
                      </td>
                      <td className="p-2 font-mono">
                        {session.worker_agent_id ?? "—"}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={sessionStatusBadgeVariant(session.status)}
                        >
                          {session.status}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(session.created_at)}
                      </td>
                      <td className="p-2 font-mono text-muted-foreground whitespace-nowrap">
                        {session.completed_at
                          ? formatTimestamp(session.completed_at)
                          : "—"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/10">
                        <td colSpan={9} className="p-4">
                          <SessionDetailView
                            session={detail?.id === session.id ? detail : session}
                            loading={detailLoading}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDetailView({
  session,
  loading,
}: {
  session: Session;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="text-xs text-muted-foreground font-mono">Loading session…</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 text-xs font-mono">
      <div className="space-y-2">
        <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
          Timestamps
        </p>
        <ul className="space-y-1 text-muted-foreground">
          <li>created: {formatTimestamp(session.created_at)}</li>
          <li>
            started:{" "}
            {session.started_at
              ? formatTimestamp(session.started_at)
              : "—"}
          </li>
          <li>
            completed:{" "}
            {session.completed_at
              ? formatTimestamp(session.completed_at)
              : "—"}
          </li>
          <li>updated: {formatTimestamp(session.updated_at)}</li>
        </ul>
        {session.worker_agent_id && (
          <p className="text-muted-foreground">
            worker agent id:{" "}
            <span className="text-foreground">{session.worker_agent_id}</span>
          </p>
        )}
      </div>
      <div className="space-y-2 sm:col-span-1">
        <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
          input_payload
        </p>
        <pre className="rounded border border-border bg-background p-2 overflow-x-auto text-[11px] max-h-32">
          {JSON.stringify(session.input_payload, null, 2)}
        </pre>
      </div>
      {session.output_payload && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
            output_payload
          </p>
          <pre className="rounded border border-border bg-background p-2 overflow-x-auto text-[11px] max-h-40">
            {JSON.stringify(session.output_payload, null, 2)}
          </pre>
        </div>
      )}
      {session.error_message && (
        <div className="space-y-1 sm:col-span-2">
          <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
            error_message
          </p>
          <p className="text-amber-400/90">{session.error_message}</p>
        </div>
      )}
      {session.routing_trace && (
        <RoutingTraceView trace={session.routing_trace as RoutingTrace} />
      )}
    </div>
  );
}

function RoutingTraceView({ trace }: { trace: RoutingTrace }) {
  const attempts = trace.attempts ?? [];
  const candidates = trace.candidates ?? [];

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
        routing_trace
      </p>
      {trace.selection_reason && (
        <p className="text-[11px] text-muted-foreground">
          {trace.selection_reason}
        </p>
      )}
      {trace.selected_agent_id != null && (
        <p className="text-[11px]">
          selected worker:{" "}
          <span className="text-foreground">{trace.selected_agent_id}</span>
        </p>
      )}
      {attempts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase">
            Failover attempts
          </p>
          <ul className="space-y-1">
            {attempts.map((a, i) => (
              <li
                key={`${a.agent_id}-${i}`}
                className="rounded border border-border px-2 py-1 text-[11px]"
              >
                worker {a.agent_id}
                {a.name ? ` (${a.name})` : ""} —{" "}
                <Badge
                  variant={
                    a.outcome === "succeeded" ? "default" : "destructive"
                  }
                  className="text-[10px] py-0"
                >
                  {a.outcome}
                </Badge>
                {a.error && (
                  <span className="block text-amber-400/90 mt-0.5">
                    {a.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {candidates.length > 0 && attempts.length === 0 && (
        <pre className="rounded border border-border bg-background p-2 overflow-x-auto text-[11px] max-h-40">
          {JSON.stringify({ candidates }, null, 2)}
        </pre>
      )}
    </div>
  );
}
