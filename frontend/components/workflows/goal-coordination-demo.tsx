"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { AppHomeShell } from "@/components/app-home/app-home-shell";
import { ExecutionFlowGraph } from "@/components/workflows/execution-flow-graph";
import {
  buildTechnicalDetails,
  ExecutionTrace,
  type TimelineDetailContext,
  type TimelineStepId,
  type TimelineStepState,
} from "@/components/workflows/execution-trace";
import { StreamingOutcome } from "@/components/workflows/streaming-outcome";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getApiErrorMessage,
  getCapabilities,
  runEcommerceLaunchWorkflow,
} from "@/lib/api";
import {
  buildProviderDiscovery,
  discoverProviders,
  getTotalProvidersEvaluated,
  parseGoalToWorkflowInput,
  PLANNED_CAPABILITIES,
  sleep,
  type DiscoveredProvider,
} from "@/lib/goal-coordination-demo";
import { cn } from "@/lib/utils";
import type { EcommerceLaunchResponse } from "@/types";

const DEFAULT_GOAL =
  "Launch a premium protein shaker bottle for US fitness customers.";

const TIMELINE_ORDER: TimelineStepId[] = [
  "goal-received",
  "capability-plan",
  "network-searched",
  "providers-selected",
  "coordination-started",
  "execution-completed",
  "outcome-assembled",
];

function initialTimeline(): TimelineStepState[] {
  return TIMELINE_ORDER.map((id) => ({
    id,
    status: "pending",
    visible: false,
  }));
}

type DemoPhase = "idle" | "running" | "complete" | "failed";

export function GoalCoordinationDemo() {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EcommerceLaunchResponse | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStepState[]>(initialTimeline);
  const [flowActiveIndex, setFlowActiveIndex] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Partial<Record<TimelineStepId, boolean>>>({});
  const [autoExpandedStep, setAutoExpandedStep] = useState<TimelineStepId | null>(null);
  const [goalText, setGoalText] = useState("");
  const [providerDiscovery, setProviderDiscovery] = useState(
    buildProviderDiscovery([])
  );
  const [discovered, setDiscovered] = useState<DiscoveredProvider[]>([]);
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);

  const hasStarted = phase !== "idle";

  const setStep = useCallback(
    (id: TimelineStepId, patch: Partial<TimelineStepState>) => {
      setTimelineSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const briefExpand = useCallback(async (id: TimelineStepId, ms = 1100) => {
    setAutoExpandedStep(id);
    await sleep(ms);
    setAutoExpandedStep((current) => (current === id ? null : current));
  }, []);

  const completeStep = useCallback(
    async (id: TimelineStepId, autoExpand = false) => {
      setStep(id, { status: "completed" });
      if (autoExpand) await briefExpand(id);
    },
    [setStep, briefExpand]
  );

  const onToggleStep = useCallback((id: TimelineStepId) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
    setAutoExpandedStep(null);
  }, []);

  const resetDemo = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setStreamStarted(false);
    setTimelineSteps(initialTimeline());
    setFlowActiveIndex(0);
    setExpandedSteps({});
    setAutoExpandedStep(null);
    setCompletedAgents([]);
  }, []);

  const timelineContext: TimelineDetailContext = useMemo(
    () => ({
      goalText,
      providerDiscovery,
      discovered,
      completedAgents,
      totalProvidersEvaluated: getTotalProvidersEvaluated(),
    }),
    [goalText, providerDiscovery, discovered, completedAgents]
  );

  const technicalDetails = useMemo(
    () => buildTechnicalDetails(result),
    [result]
  );

  const runGoal = useCallback(async () => {
    const trimmed = goal.trim();
    if (!trimmed) return;

    setPhase("running");
    setGoalText(trimmed);
    setError(null);
    setResult(null);
    setStreamStarted(false);
    setTimelineSteps(initialTimeline());
    setFlowActiveIndex(0);
    setExpandedSteps({});
    setAutoExpandedStep(null);
    setCompletedAgents([]);

    setStep("goal-received", { visible: true, status: "completed" });
    setFlowActiveIndex(0);
    await sleep(450);

    setStep("capability-plan", { visible: true, status: "running" });
    setFlowActiveIndex(1);
    await sleep(500);
    await completeStep("capability-plan", true);

    setStep("network-searched", { visible: true, status: "running" });
    setFlowActiveIndex(2);

    let discoveredProviders = discoverProviders([]);
    try {
      const registry = await getCapabilities();
      discoveredProviders = discoverProviders(registry.capabilities);
    } catch {
      discoveredProviders = discoverProviders([]);
    }

    const discovery = buildProviderDiscovery(discoveredProviders);
    setDiscovered(discoveredProviders);
    setProviderDiscovery(discovery);

    await sleep(600);
    await completeStep("network-searched");

    setStep("providers-selected", { visible: true, status: "running" });
    await sleep(400);
    await completeStep("providers-selected");

    setStep("coordination-started", { visible: true, status: "running" });
    await sleep(450);
    await completeStep("coordination-started");

    setStep("execution-completed", { visible: true, status: "running" });
    setFlowActiveIndex(3);

    const workflowPromise = runEcommerceLaunchWorkflow(
      parseGoalToWorkflowInput(trimmed, 1)
    );

    let workflowResult: EcommerceLaunchResponse;
    try {
      workflowResult = await workflowPromise;
    } catch (e) {
      setError(getApiErrorMessage(e));
      setPhase("failed");
      setStep("execution-completed", { status: "failed" });
      return;
    }

    const agents: string[] = [];
    for (const cap of PLANNED_CAPABILITIES) {
      agents.push(cap.agentLabel);
      setCompletedAgents([...agents]);
      await sleep(320);
    }

    await completeStep("execution-completed");

    setStep("outcome-assembled", { visible: true, status: "running" });
    setFlowActiveIndex(4);
    await sleep(350);
    await completeStep("outcome-assembled");

    setResult(workflowResult);
    setPhase("complete");
    await sleep(250);
    setStreamStarted(true);
  }, [goal, setStep, completeStep]);

  return (
    <AppHomeShell>
      <div
        className={cn(
          "mx-auto px-5 sm:px-8",
          hasStarted ? "max-w-6xl pb-20 pt-8" : "max-w-xl pb-32 pt-20 sm:pt-28"
        )}
      >
        {!hasStarted ? (
          <IdleGoalInput
            goal={goal}
            setGoal={setGoal}
            onRun={() => void runGoal()}
            error={error}
          />
        ) : (
          <div className="space-y-8">
            <ExecutionFlowGraph activeIndex={flowActiveIndex} />

            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
              <aside className="lg:w-[400px] shrink-0">
                <div className="lg:sticky lg:top-20 rounded-2xl border border-clozr-border bg-clozr-surface shadow-[0_1px_2px_rgba(5,5,5,0.04),0_4px_16px_rgba(5,5,5,0.03)] p-5 sm:p-6">
                  <div className="space-y-1 mb-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-clozr-muted">
                      Network coordination
                    </p>
                    <h1 className="text-lg font-semibold tracking-tight text-clozr-primary">
                      Execution Trace
                    </h1>
                  </div>

                  <ExecutionTrace
                    steps={timelineSteps}
                    context={timelineContext}
                    autoExpandedStep={autoExpandedStep}
                    technicalDetails={technicalDetails}
                    failed={phase === "failed"}
                    onToggleStep={onToggleStep}
                    expandedSteps={expandedSteps}
                  />

                  {error ? (
                    <p className="mt-4 text-xs text-red-600 font-mono leading-relaxed">
                      {error}
                    </p>
                  ) : null}

                  {phase === "complete" ? (
                    <button
                      type="button"
                      onClick={resetDemo}
                      className="mt-4 text-xs text-clozr-muted hover:text-clozr-primary transition-colors"
                    >
                      Run another goal
                    </button>
                  ) : null}
                </div>
              </aside>

              <main className="flex-1 min-w-0 lg:pt-1">
                {phase === "failed" ? (
                  <div className="max-w-xl">
                    <h2 className="text-lg font-semibold text-clozr-primary">
                      Coordination interrupted
                    </h2>
                    <p className="mt-2 text-sm text-clozr-secondary">
                      The network could not complete this goal. Check that
                      capability providers are registered and healthy.
                    </p>
                  </div>
                ) : result ? (
                  <div className="max-w-2xl">
                    <StreamingOutcome
                      result={result}
                      started={streamStarted}
                    />
                  </div>
                ) : (
                  <div className="max-w-xl space-y-4">
                    <div className="flex items-center gap-2 text-sm text-clozr-secondary">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 text-clozr-coral" />
                      Coordinating specialized agents…
                    </div>
                    <p className="text-sm text-clozr-muted leading-relaxed">
                      CLOZR is discovering providers, routing work between
                      agents, and assembling a coordinated outcome.
                    </p>
                  </div>
                )}
              </main>
            </div>
          </div>
        )}
      </div>
    </AppHomeShell>
  );
}

function IdleGoalInput({
  goal,
  setGoal,
  onRun,
  error,
}: {
  goal: string;
  setGoal: (v: string) => void;
  onRun: () => void;
  error: string | null;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-clozr-primary leading-tight">
        What do you want to accomplish?
      </h1>

      <div className="mt-10 space-y-5 text-left">
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="resize-none border-clozr-border bg-clozr-surface text-clozr-primary text-[15px] leading-relaxed shadow-none focus-visible:ring-2 focus-visible:ring-clozr-coral/25 focus-visible:border-clozr-coral/40 rounded-lg font-sans tracking-normal"
          placeholder="Launch a premium protein shaker bottle for US fitness customers."
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onRun();
          }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            type="button"
            onClick={onRun}
            disabled={!goal.trim()}
            className="h-11 px-6 rounded-lg bg-clozr-black hover:bg-clozr-black/90 text-white shadow-none ring-1 ring-transparent hover:ring-clozr-coral/30 focus-visible:ring-clozr-coral/40"
          >
            Run Goal
            <ArrowRight className="ml-2 h-4 w-4 text-clozr-coral" />
          </Button>
          <span className="text-xs text-clozr-muted">
            ⌘ + Enter to run
          </span>
        </div>

        {error ? (
          <p className="text-sm text-red-600 font-mono">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
