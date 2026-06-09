"use client";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

const FLOW_STEPS = [
  "Goal",
  "Capability Plan",
  "Provider Discovery",
  "Agent Execution",
  "Coordinated Outcome",
] as const;

export function ExecutionFlowGraph({
  activeIndex = 4,
  className,
}: {
  activeIndex?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-2 text-[11px] sm:text-xs text-clozr-muted",
        className
      )}
    >
      {FLOW_STEPS.map((step, i) => {
        const active = i <= activeIndex;
        const current = i === activeIndex;
        return (
          <div key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 whitespace-nowrap transition-colors",
                current
                  ? "border-clozr-coral bg-clozr-accent-soft text-clozr-primary font-medium"
                  : active
                    ? "border-clozr-border bg-clozr-surface text-clozr-primary"
                    : "border-clozr-border-soft bg-clozr-surface-soft text-clozr-muted"
              )}
            >
              {step}
            </span>
            {i < FLOW_STEPS.length - 1 ? (
              <ArrowRight className="h-3 w-3 shrink-0 text-clozr-border" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
