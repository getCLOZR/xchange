"use client";

import { ChevronDown, ChevronRight, Eye, Layers, RefreshCw } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { CollapsibleBlock } from "@/components/dashboard/collapsible-block";
import { RoutingExplanationModal } from "@/components/dashboard/routing-explanation-view";
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
  getApiErrorMessage,
  getSession,
  getSessionRouting,
  getSessions,
} from "@/lib/api";
import { sessionStatusBadgeVariant } from "@/lib/session-utils";
import { cn, formatTimestamp } from "@/lib/utils";
import type { RoutingExplanation, RoutingTrace, Session } from "@/types";

interface SessionsPanelProps {
  refreshKey?: number;
  highlightSessionId?: number | null;
}

export function SessionsPanel({
  refreshKey = 0,
  highlightSessionId = null,
}: SessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [routingModal, setRoutingModal] = useState<{
    sessionId: number;
    explanation: RoutingExplanation | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  async function openRouting(sessionId: number) {
    setRoutingModal({ sessionId, explanation: null, loading: true, error: null });
    try {
      const explanation = await getSessionRouting(sessionId);
      setRoutingModal({
        sessionId,
        explanation,
        loading: false,
        error: null,
      });
    } catch (e) {
      setRoutingModal({
        sessionId,
        explanation: null,
        loading: false,
        error: getApiErrorMessage(e),
      });
    }
  }

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

  useEffect(() => {
    if (highlightSessionId == null) return;
    void (async () => {
      await toggleExpand(highlightSessionId);
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- highlight only when id changes
  }, [highlightSessionId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Orchestration sessions
          </CardTitle>
          <CardDescription>
            GET /sessions — expand a row for payloads and routing trace
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
        <div className="overflow-x-auto rounded-md border border-border max-h-[480px] overflow-y-auto">
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
                <th className="p-2 font-medium w-24">Routing</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No orchestration sessions yet. Dispatch a task to create one.
                  </td>
                </tr>
              )}
              {sessions.map((session) => {
                const isOpen = expandedId === session.id;
                return (
                  <Fragment key={session.id}>
                    <tr
                      ref={
                        highlightSessionId === session.id ? highlightRef : undefined
                      }
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/20 cursor-pointer",
                        isOpen && "bg-muted/30",
                        highlightSessionId === session.id &&
                          "ring-1 ring-violet-500/60 bg-violet-500/5"
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
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void openRouting(session.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/10">
                        <td colSpan={9} className="p-4">
                          <SessionDetailView
                            session={
                              detail?.id === session.id ? detail : session
                            }
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

      {routingModal && !routingModal.loading && routingModal.explanation && (
        <RoutingExplanationModal
          title={`Routing — session ${routingModal.sessionId}`}
          explanation={routingModal.explanation}
          onClose={() => setRoutingModal(null)}
        />
      )}
      {routingModal?.loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">
          Loading routing for session {routingModal.sessionId}…
        </div>
      )}
      {routingModal?.error && !routingModal.loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80">
          <div className="rounded-lg border border-border bg-card p-4 max-w-md">
            <p className="text-sm text-amber-400/90 font-mono">{routingModal.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setRoutingModal(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function JsonPre({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] font-mono overflow-x-auto max-h-40 rounded border border-border bg-background p-2">
      {JSON.stringify(data, null, 2)}
    </pre>
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

  const trace = session.routing_trace as RoutingTrace | null | undefined;

  return (
    <div className="space-y-2 text-xs font-mono">
      <div className="flex flex-wrap gap-3 text-muted-foreground text-[11px]">
        <span>created {formatTimestamp(session.created_at)}</span>
        {session.started_at && (
          <span>started {formatTimestamp(session.started_at)}</span>
        )}
        {session.completed_at && (
          <span>completed {formatTimestamp(session.completed_at)}</span>
        )}
        {session.worker_agent_id != null && (
          <span className="text-foreground">
            worker {session.worker_agent_id}
          </span>
        )}
      </div>

      <CollapsibleBlock title="input_payload" defaultOpen>
        <JsonPre data={session.input_payload} />
      </CollapsibleBlock>

      {session.output_payload != null && (
        <CollapsibleBlock title="output_payload" defaultOpen={false}>
          <JsonPre data={session.output_payload} />
        </CollapsibleBlock>
      )}

      {session.error_message && (
        <CollapsibleBlock title="error_message" defaultOpen>
          <p className="text-amber-400/90 text-[11px] p-1">
            {session.error_message}
          </p>
        </CollapsibleBlock>
      )}

      {trace && <RoutingTraceDetail trace={trace} />}
    </div>
  );
}

function RoutingTraceDetail({ trace }: { trace: RoutingTrace }) {
  const attempts = trace.attempts ?? [];
  const candidates = (trace.candidates ?? []) as Array<Record<string, unknown>>;

  return (
    <CollapsibleBlock title="routing_trace" defaultOpen>
      <div className="space-y-2 text-[11px]">
        {trace.capability && (
          <p className="text-muted-foreground">
            capability: <span className="text-foreground">{trace.capability}</span>
          </p>
        )}
        {trace.filters && trace.filters.length > 0 && (
          <p className="text-muted-foreground">
            filters: {trace.filters.join(", ")}
          </p>
        )}
        {trace.selected_agent_id != null && (
          <p>
            selected worker:{" "}
            <span className="text-foreground">{trace.selected_agent_id}</span>
          </p>
        )}
        {trace.selection_reason && (
          <p className="text-muted-foreground">{trace.selection_reason}</p>
        )}

        {candidates.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">
              Candidate workers
            </p>
            <ul className="space-y-1">
              {candidates.map((c, i) => (
                <li
                  key={`${c.agent_id ?? i}-${i}`}
                  className="rounded border border-border px-2 py-1"
                >
                  #{String(c.agent_id)} {String(c.name ?? c.agent_name ?? "")} — score{" "}
                  {typeof c.score === "number" ? c.score.toFixed(3) : "—"}
                  {typeof c.score_breakdown === "object" &&
                  c.score_breakdown !== null ? (
                    <span className="block text-muted-foreground text-[10px]">
                      {Object.entries(
                        c.score_breakdown as Record<string, unknown>
                      )
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {attempts.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">
              Failover attempts
            </p>
            <ul className="space-y-1">
              {attempts.map((a, i) => (
                <li
                  key={`${a.agent_id}-${i}`}
                  className="rounded border border-border px-2 py-1"
                >
                  worker {a.agent_id}
                  {a.name ? ` (${a.name})` : ""} —{" "}
                  <Badge
                    variant={
                      a.outcome === "succeeded" ? "success" : "warning"
                    }
                    className="text-[10px] py-0"
                  >
                    {a.outcome}
                  </Badge>
                  {a.score != null && (
                    <span className="text-muted-foreground ml-1">
                      score {a.score.toFixed(3)}
                    </span>
                  )}
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

        <CollapsibleBlock title="routing_trace (raw JSON)" defaultOpen={false}>
          <JsonPre data={trace} />
        </CollapsibleBlock>
      </div>
    </CollapsibleBlock>
  );
}
