"use client";

import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoutingExplainedCandidate, RoutingExplanation } from "@/types";

const SCORE_LABELS: Record<string, string> = {
  success_rate_score: "Success rate (50% weight)",
  latency_score: "Latency (25% weight)",
  cost_score: "Cost (15% weight)",
  health_score: "Health (10% weight)",
  final_score: "Final score",
};

function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${ms.toFixed(1)} ms`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function FilterList({ filters }: { filters: string[] }) {
  if (filters.length === 0) {
    return <p className="text-xs text-muted-foreground font-mono">No filters applied</p>;
  }
  return (
    <ul className="space-y-1">
      {filters.map((f) => (
        <li key={f} className="flex items-center gap-2 text-xs font-mono">
          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  );
}

function CandidateScoreBreakdown({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const entries = Object.entries(breakdown).filter(([k]) => k !== "final_score");
  return (
    <div className="mt-2 space-y-1 text-[10px] font-mono text-muted-foreground border-t border-border/50 pt-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4">
          <span>{SCORE_LABELS[key] ?? key}</span>
          <span className="text-foreground">{value.toFixed(4)}</span>
        </div>
      ))}
      {breakdown.final_score != null && (
        <div className="flex justify-between gap-4 font-medium text-foreground pt-1">
          <span>{SCORE_LABELS.final_score}</span>
          <span>{breakdown.final_score.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  isWinner,
}: {
  candidate: RoutingExplainedCandidate;
  isWinner: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown =
    candidate.score_breakdown && Object.keys(candidate.score_breakdown).length > 0;

  return (
    <>
      <tr
        className={cn(
          "border-t border-border/50 align-top",
          isWinner && "bg-emerald-500/5",
          !candidate.eligible && "opacity-80"
        )}
      >
        <td className="p-2 font-mono">
          {candidate.rank ?? "—"}
          {isWinner ? (
            <Badge variant="success" className="ml-1 text-[9px] py-0">
              winner
            </Badge>
          ) : null}
        </td>
        <td className="p-2">
          <span className="font-medium">{candidate.agent_name}</span>
          <span className="text-muted-foreground ml-1">#{candidate.agent_id}</span>
          {!candidate.eligible && candidate.exclusion_message ? (
            <p className="text-[10px] text-amber-400/90 mt-0.5">
              {candidate.exclusion_message}
            </p>
          ) : null}
        </td>
        <td className="p-2">
          <Badge variant={candidate.is_healthy ? "success" : "warning"}>
            {candidate.is_healthy ? "yes" : "no"}
          </Badge>
        </td>
        <td className="p-2 font-mono">{formatRate(candidate.success_rate)}</td>
        <td className="p-2 font-mono">{formatLatency(candidate.avg_response_time_ms)}</td>
        <td className="p-2 font-mono">
          {candidate.score != null ? candidate.score.toFixed(4) : "—"}
        </td>
        <td className="p-2">
          {candidate.eligible ? (
            <Badge variant="success">yes</Badge>
          ) : (
            <Badge variant="warning">no</Badge>
          )}
        </td>
        <td className="p-2 w-8">
          {hasBreakdown && candidate.eligible ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Toggle score breakdown"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </td>
      </tr>
      {expanded && hasBreakdown && candidate.score_breakdown ? (
        <tr className="border-t border-border/30 bg-muted/10">
          <td colSpan={8} className="p-3">
            <CandidateScoreBreakdown breakdown={candidate.score_breakdown} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export interface RoutingExplanationViewProps {
  explanation: RoutingExplanation;
  showSummary?: boolean;
  className?: string;
}

export function RoutingExplanationView({
  explanation,
  showSummary = true,
  className,
}: RoutingExplanationViewProps) {
  const eligible = explanation.candidates.filter((c) => c.eligible);
  const excluded = explanation.candidates.filter((c) => !c.eligible);
  const winnerId = explanation.selected_worker?.agent_id ?? explanation.selected_agent_id;

  return (
    <div className={cn("space-y-4 text-xs", className)}>
      {showSummary && (
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Capability</dt>
            <dd className="font-mono font-medium">{explanation.capability}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Candidates considered</dt>
            <dd className="font-mono">{explanation.candidate_count}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Selected worker</dt>
            <dd className="font-mono">
              {explanation.selected_worker?.agent_name ??
                (winnerId != null ? `Agent ${winnerId}` : "—")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-xs">Reason</dt>
            <dd>{explanation.selection_reason || "—"}</dd>
          </div>
        </dl>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Filters applied
        </p>
        <FilterList filters={explanation.filters_applied ?? explanation.filters ?? []} />
      </div>

      {explanation.candidate_count === 0 || eligible.length === 0 ? (
        <p className="text-sm text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-3">
          No eligible workers were available for this capability.
        </p>
      ) : null}

      {explanation.candidates.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="p-2">Rank</th>
                <th className="p-2">Agent</th>
                <th className="p-2">Healthy</th>
                <th className="p-2">Success</th>
                <th className="p-2">Latency</th>
                <th className="p-2">Score</th>
                <th className="p-2">Eligible</th>
                <th className="p-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {eligible.map((c) => (
                <CandidateRow
                  key={`eligible-${c.agent_id}`}
                  candidate={c}
                  isWinner={c.agent_id === winnerId}
                />
              ))}
              {excluded.map((c) => (
                <CandidateRow
                  key={`excluded-${c.agent_id}`}
                  candidate={c}
                  isWinner={false}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {explanation.dispatch_attempts && explanation.dispatch_attempts.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
            Dispatch attempts
          </p>
          <ul className="space-y-1 font-mono">
            {explanation.dispatch_attempts.map((a, i) => (
              <li
                key={`${a.agent_id}-${i}`}
                className="rounded border border-border px-2 py-1"
              >
                {a.name ?? `Agent ${a.agent_id}`} —{" "}
                <Badge
                  variant={a.outcome === "succeeded" ? "success" : "warning"}
                  className="text-[10px] py-0"
                >
                  {a.outcome}
                </Badge>
                {a.score != null && (
                  <span className="text-muted-foreground ml-1">
                    score {Number(a.score).toFixed(4)}
                  </span>
                )}
                {a.error && (
                  <span className="block text-amber-400/90 mt-0.5">{a.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function RoutingExplanationModal({
  title,
  explanation,
  onClose,
}: {
  title: string;
  explanation: RoutingExplanation | null;
  onClose: () => void;
}) {
  if (!explanation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="routing-modal-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h2 id="routing-modal-title" className="text-sm font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <RoutingExplanationView explanation={explanation} />
      </div>
    </div>
  );
}
