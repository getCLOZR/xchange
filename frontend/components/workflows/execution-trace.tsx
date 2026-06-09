"use client";

import { Check, ChevronDown, Circle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";

import {
  COORDINATION_HANDOFFS,
  PLANNED_CAPABILITIES,
  type CapabilityProviderDiscovery,
  type DiscoveredProvider,
} from "@/lib/goal-coordination-demo";
import { cn } from "@/lib/utils";
import type { EcommerceLaunchResponse } from "@/types";

export type TimelineStepId =
  | "goal-received"
  | "capability-plan"
  | "network-searched"
  | "providers-selected"
  | "coordination-started"
  | "execution-completed"
  | "outcome-assembled";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface TimelineStepState {
  id: TimelineStepId;
  status: StepStatus;
  visible: boolean;
}

export interface TimelineDetailContext {
  goalText: string;
  providerDiscovery: CapabilityProviderDiscovery[];
  discovered: DiscoveredProvider[];
  completedAgents: string[];
  totalProvidersEvaluated: number;
}

export interface TechnicalDetailsData {
  workflowId: string | null;
  sessionIds: number[];
  workerIds: number[];
  routingSummary: unknown;
  workflowTrace: unknown;
}

const STEP_META: Record<
  TimelineStepId,
  { title: string; subtitle: string; badge?: string }
> = {
  "goal-received": { title: "Goal received", subtitle: "User goal captured" },
  "capability-plan": {
    title: "Capability plan created",
    subtitle: "4 capabilities recognized",
    badge: "4",
  },
  "network-searched": {
    title: "Network searched",
    subtitle: "12 providers evaluated",
    badge: "12",
  },
  "providers-selected": {
    title: "Providers selected",
    subtitle: "4 agents selected",
    badge: "4",
  },
  "coordination-started": {
    title: "Coordination started",
    subtitle: "3 handoffs mapped",
    badge: "3",
  },
  "execution-completed": {
    title: "Execution completed",
    subtitle: "4 agents completed",
    badge: "4",
  },
  "outcome-assembled": {
    title: "Outcome assembled",
    subtitle: "Launch package generated",
  },
};

const SELECTION_TAGS: Record<string, string[]> = {
  product_research: ["healthy endpoint", "best match", "schema compatible"],
  seo_keywords: ["healthy endpoint", "best match", "low latency"],
  product_copy: ["healthy endpoint", "best match", "schema compatible"],
  marketing_copy: ["healthy endpoint", "best match", "schema compatible"],
};

const OUTCOME_ARTIFACTS = [
  "Research brief",
  "SEO keyword map",
  "Product page copy",
  "Launch campaign copy",
  "Structured workflow trace",
];

function stepStyles(step: TimelineStepState) {
  const isRunning = step.status === "running";
  const isOutcome =
    step.id === "outcome-assembled" && step.status === "completed";

  return {
    border: isRunning
      ? "border-l-clozr-coral"
      : isOutcome
        ? "border-l-emerald-500"
        : "border-l-clozr-border",
    row: isRunning ? "bg-clozr-accent-soft" : "hover:bg-clozr-surface-soft",
    badge: isRunning
      ? "bg-clozr-accent-soft text-clozr-coral border border-clozr-accent-border"
      : "bg-clozr-surface-soft text-clozr-secondary",
    icon: isRunning
      ? "text-clozr-coral"
      : isOutcome
        ? "text-emerald-600"
        : step.status === "completed"
          ? "text-clozr-secondary"
          : "text-clozr-muted",
  };
}

export function buildTechnicalDetails(
  result: EcommerceLaunchResponse | null
): TechnicalDetailsData | null {
  if (!result) return null;

  const steps = result.workflow_trace?.steps;
  const traceSteps = Array.isArray(steps) ? steps : [];

  const sessionIds = traceSteps
    .map((s) => (s as { session_id?: number | null }).session_id)
    .filter((id): id is number => typeof id === "number");

  const workerIds = traceSteps
    .map((s) => (s as { worker_agent_id?: number | null }).worker_agent_id)
    .filter((id): id is number => typeof id === "number");

  return {
    workflowId: result.workflow_id ?? null,
    sessionIds,
    workerIds,
    routingSummary: traceSteps.map((s) => ({
      capability: (s as { capability?: string }).capability,
      routing_summary: (s as { routing_summary?: unknown }).routing_summary,
    })),
    workflowTrace: result.workflow_trace,
  };
}

export function ExecutionTrace({
  steps,
  context,
  autoExpandedStep,
  technicalDetails,
  failed,
  onToggleStep,
  expandedSteps,
}: {
  steps: TimelineStepState[];
  context: TimelineDetailContext;
  autoExpandedStep: TimelineStepId | null;
  technicalDetails: TechnicalDetailsData | null;
  failed: boolean;
  onToggleStep: (id: TimelineStepId) => void;
  expandedSteps: Partial<Record<TimelineStepId, boolean>>;
}) {
  const [techOpen, setTechOpen] = useState(false);
  const visibleSteps = steps.filter((s) => s.visible);

  return (
    <div className="border-t border-clozr-border pt-4">
      <p className="text-xs text-clozr-secondary leading-relaxed mb-4">
        CLOZR decomposed the goal, discovered providers, and coordinated
        execution.
      </p>

      <ol className="space-y-0.5">
        {visibleSteps.map((step) => {
          const meta = STEP_META[step.id];
          const styles = stepStyles(step);
          const isExpanded =
            expandedSteps[step.id] === true || autoExpandedStep === step.id;
          const hasDetails =
            step.status === "completed" || step.status === "running";

          return (
            <li
              key={step.id}
              className="animate-in fade-in slide-in-from-left-1 duration-300"
            >
              <button
                type="button"
                onClick={() => hasDetails && onToggleStep(step.id)}
                disabled={!hasDetails}
                className={cn(
                  "w-full flex items-start gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2.5 text-left transition-colors",
                  styles.border,
                  step.status === "running" && styles.row,
                  hasDetails && "hover:bg-clozr-surface-soft cursor-pointer",
                  !hasDetails && "cursor-default"
                )}
              >
                <StepIcon
                  status={step.status}
                  iconClass={styles.icon}
                  failed={failed}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-clozr-primary leading-tight">
                      {meta.title}
                    </span>
                    {meta.badge && step.status !== "pending" ? (
                      <span
                        className={cn(
                          "text-[10px] font-medium rounded-full px-1.5 py-0.5 tabular-nums",
                          styles.badge
                        )}
                      >
                        {step.id === "network-searched"
                          ? context.totalProvidersEvaluated
                          : meta.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-clozr-muted mt-0.5">
                    {step.status === "running" ? "In progress…" : meta.subtitle}
                  </p>
                </div>
                {hasDetails ? (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 mt-1 text-clozr-muted transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                ) : null}
              </button>

              {isExpanded && hasDetails ? (
                <div className="mx-1 mb-1 mt-0.5 rounded-md border border-clozr-border bg-clozr-surface-soft px-2.5 py-2 text-[11px] leading-relaxed text-clozr-secondary animate-in fade-in duration-200">
                  <StepDetails stepId={step.id} context={context} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {technicalDetails ? (
        <div className="mt-4 pt-3 border-t border-clozr-border">
          <button
            type="button"
            onClick={() => setTechOpen((o) => !o)}
            className="flex w-full items-center justify-between text-[11px] font-medium text-clozr-muted hover:text-clozr-primary"
          >
            Technical details
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                techOpen && "rotate-180"
              )}
            />
          </button>
          {techOpen ? (
            <div className="mt-2 space-y-2 text-[10px] font-mono text-clozr-muted animate-in fade-in duration-200">
              {technicalDetails.workflowId ? (
                <p>
                  <span className="text-clozr-primary">workflow_id:</span>{" "}
                  {technicalDetails.workflowId}
                </p>
              ) : null}
              {technicalDetails.sessionIds.length > 0 ? (
                <p>
                  <span className="text-clozr-primary">session_ids:</span>{" "}
                  {technicalDetails.sessionIds.join(", ")}
                </p>
              ) : null}
              {technicalDetails.workerIds.length > 0 ? (
                <p>
                  <span className="text-clozr-primary">worker_ids:</span>{" "}
                  {technicalDetails.workerIds.join(", ")}
                </p>
              ) : null}
              <details>
                <summary className="cursor-pointer hover:text-clozr-primary">
                  routing_summary
                </summary>
                <pre className="mt-1 overflow-x-auto rounded border border-clozr-border bg-clozr-surface p-2 max-h-32">
                  {JSON.stringify(technicalDetails.routingSummary, null, 2)}
                </pre>
              </details>
              <details>
                <summary className="cursor-pointer hover:text-clozr-primary">
                  workflow_trace
                </summary>
                <pre className="mt-1 overflow-x-auto rounded border border-clozr-border bg-clozr-surface p-2 max-h-40">
                  {JSON.stringify(technicalDetails.workflowTrace, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StepIcon({
  status,
  iconClass,
  failed,
}: {
  status: StepStatus;
  iconClass: string;
  failed: boolean;
}) {
  if (status === "completed") {
    return (
      <Check
        className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", iconClass)}
        strokeWidth={2.5}
      />
    );
  }
  if (status === "running") {
    return (
      <Loader2
        className={cn("h-3.5 w-3.5 shrink-0 mt-0.5 animate-spin", iconClass)}
      />
    );
  }
  if (status === "failed" && failed) {
    return <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />;
  }
  return (
    <Circle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-clozr-border" />
  );
}

function StepDetails({
  stepId,
  context,
}: {
  stepId: TimelineStepId;
  context: TimelineDetailContext;
}) {
  switch (stepId) {
    case "goal-received":
      return (
        <p className="italic leading-relaxed rounded-md border border-clozr-border bg-clozr-beige/20 px-2 py-1.5 text-clozr-secondary">
          &ldquo;{context.goalText}&rdquo;
        </p>
      );

    case "capability-plan":
      return (
        <div>
          <p className="font-medium text-clozr-primary mb-1.5">
            Detected capabilities
          </p>
          <ul className="space-y-0.5">
            {PLANNED_CAPABILITIES.map((c) => (
              <li key={c.name}>• {c.name}</li>
            ))}
          </ul>
        </div>
      );

    case "network-searched":
      return (
        <div className="space-y-2">
          <span className="inline-block rounded-full border border-clozr-accent-border bg-clozr-accent-soft text-clozr-coral text-[10px] font-medium px-2 py-0.5">
            {context.totalProvidersEvaluated} total providers evaluated
          </span>
          {context.providerDiscovery.map((group) => {
            const selected = group.candidates.find((c) => c.selected);
            const alternates = group.candidates
              .filter((c) => !c.selected)
              .map((c) => c.name);
            return (
              <div key={group.capability}>
                <p className="font-medium text-clozr-primary">
                  {group.capability}
                </p>
                <p className="text-[10px] text-clozr-muted">
                  {group.candidates.length} providers found
                </p>
                {selected ? (
                  <p className="text-[10px] mt-0.5">
                    <span className="text-clozr-coral font-medium">
                      Selected: {selected.name}
                    </span>
                    {alternates.length > 0 ? (
                      <span className="text-clozr-muted">
                        {" "}
                        · Alternates: {alternates.join(", ")}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      );

    case "providers-selected":
      return (
        <ul className="space-y-2">
          {context.discovered.map((d) => (
            <li key={d.capability}>
              <p className="text-clozr-primary">
                {d.capability} → {d.agentName ?? "Provider"}
              </p>
              <p className="text-[10px] text-clozr-muted mt-0.5">
                {(SELECTION_TAGS[d.capability] ?? ["best match"]).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      );

    case "coordination-started":
      return (
        <ul className="space-y-2">
          {COORDINATION_HANDOFFS.map((h) => (
            <li key={`${h.from}-${h.payload}`}>
              <p>{h.from}</p>
              <p className="text-clozr-muted pl-2">→ {h.payload}</p>
              <p className="pl-2">→ {h.to}</p>
            </li>
          ))}
        </ul>
      );

    case "execution-completed":
      return (
        <ul className="space-y-1">
          {context.completedAgents.map((agent) => (
            <li key={agent}>✓ {agent} completed</li>
          ))}
        </ul>
      );

    case "outcome-assembled":
      return (
        <div>
          <p className="font-medium text-clozr-primary mb-1.5">Generated</p>
          <ul className="space-y-0.5">
            {OUTCOME_ARTIFACTS.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}
