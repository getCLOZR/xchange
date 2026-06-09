"use client";

import { useEffect, useRef, useState } from "react";

import { buildRoutingSummary } from "@/lib/goal-coordination-demo";
import { useStreamingText } from "@/lib/use-streaming-text";
import { cn } from "@/lib/utils";
import type { EcommerceLaunchResponse } from "@/types";

interface OutcomeSection {
  id: string;
  title: string;
  content: string;
}

const STRUCTURED_ARTIFACTS = [
  { id: "brief", label: "Product page brief", status: "Generated" },
  { id: "seo", label: "SEO keyword map", status: "Structured" },
  { id: "metadata", label: "Product title and metadata", status: "Generated" },
  { id: "ads", label: "Ad copy set", status: "Ready for export" },
  { id: "email", label: "Email launch brief", status: "Generated" },
  { id: "trace", label: "Workflow trace JSON", status: "Structured" },
] as const;

function formatResearch(result: EcommerceLaunchResponse): string {
  const parts: string[] = [];
  if (result.market_summary) parts.push(result.market_summary);
  if (result.competitors.length > 0) {
    parts.push("");
    parts.push("Competitive landscape:");
    for (const c of result.competitors) {
      parts.push(
        `• ${String(c.name)} — ${String(c.positioning)} (${String(c.price_range)})`
      );
    }
  }
  return parts.join("\n");
}

function formatMarketing(result: EcommerceLaunchResponse): string {
  const parts: string[] = [];
  if (result.launch_angle) parts.push(result.launch_angle);
  if (result.customer_angles.length > 0) {
    parts.push("");
    parts.push("Customer angles:");
    for (const angle of result.customer_angles) {
      parts.push(`• ${angle}`);
    }
  }
  if (result.bullet_points.length > 0) {
    parts.push("");
    parts.push("Key highlights:");
    for (const point of result.bullet_points) {
      parts.push(`• ${point}`);
    }
  }
  if (result.ad_copy.length > 0) {
    parts.push("");
    for (const ad of result.ad_copy) {
      parts.push(`${ad.channel}:\n${ad.copy}`);
    }
  }
  if (result.meta_description) {
    parts.push("");
    parts.push(`Meta: ${result.meta_description}`);
  }
  return parts.join("\n");
}

function buildOutcomeSections(result: EcommerceLaunchResponse): OutcomeSection[] {
  return [
    {
      id: "research",
      title: "Market Research",
      content: formatResearch(result),
    },
    {
      id: "seo",
      title: "SEO Opportunities",
      content: result.seo_keywords.join(", "),
    },
    {
      id: "title",
      title: "Product Title",
      content: result.product_title ?? "",
    },
    {
      id: "description",
      title: "Product Description",
      content: result.product_description ?? "",
    },
    {
      id: "marketing",
      title: "Marketing Angles",
      content: formatMarketing(result),
    },
    {
      id: "email",
      title: "Email Subjects",
      content: result.email_subjects.map((s) => `• ${s}`).join("\n"),
    },
  ].filter((s) => s.content.trim().length > 0);
}

function StreamingSection({
  title,
  content,
  active,
  onFinished,
}: {
  title: string;
  content: string;
  active: boolean;
  onFinished: () => void;
}) {
  const { displayed, done } = useStreamingText(content, {
    enabled: active,
    charDelayMs: 12,
  });
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;
  }, [content]);

  useEffect(() => {
    if (active && done && !finishedRef.current) {
      finishedRef.current = true;
      onFinished();
    }
  }, [active, done, onFinished]);

  if (!active) return null;

  return (
    <section className="pb-10 border-b border-clozr-border-soft last:border-0">
      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-clozr-primary mb-4">
        {title}
      </h3>
      <div className="text-[15px] sm:text-base leading-[1.75] text-clozr-secondary whitespace-pre-wrap">
        {displayed}
        {!done ? (
          <span className="inline-block w-[2px] h-[1em] bg-clozr-coral/50 ml-0.5 align-middle animate-pulse" />
        ) : null}
      </div>
    </section>
  );
}

function NetworkRoutingSummary({
  result,
}: {
  result: EcommerceLaunchResponse;
}) {
  const summary = buildRoutingSummary(result);

  const stats = [
    { label: "capabilities recognized", value: summary.capabilitiesRecognized },
    { label: "providers selected", value: summary.providersSelected },
    { label: "agent executions completed", value: summary.agentExecutions },
    { label: "handoffs between agents", value: summary.handoffs },
    { label: "coordinated outcomes generated", value: summary.outcomesGenerated },
  ];

  return (
    <div className="mb-10 rounded-xl border border-clozr-border bg-clozr-surface px-4 py-4 sm:px-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-clozr-muted">
        Network routing summary
      </p>
      <ul className="mt-3 space-y-1.5">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="flex items-baseline gap-2 text-sm text-clozr-primary"
          >
            <span className="font-semibold tabular-nums text-clozr-coral">
              {stat.value}
            </span>
            <span className="text-clozr-secondary">{stat.label}</span>
          </li>
        ))}
      </ul>
      {summary.workflowId ? (
        <p className="mt-3 text-[11px] font-mono text-clozr-muted">
          workflow_id: {summary.workflowId}
        </p>
      ) : null}
    </div>
  );
}

function StructuredArtifacts({
  result,
  visible,
}: {
  result: EcommerceLaunchResponse;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <section className="pt-4 animate-in fade-in duration-500">
      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-clozr-primary mb-4">
        Structured Artifacts
      </h3>
      <p className="text-sm text-clozr-secondary mb-5">
        System-generated package assembled from coordinated agent outputs.
      </p>
      <ul className="space-y-2">
        {STRUCTURED_ARTIFACTS.map((artifact) => (
          <li
            key={artifact.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-clozr-border bg-clozr-surface px-3 py-2.5"
          >
            <span className="text-sm text-clozr-primary">{artifact.label}</span>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5",
                artifact.status === "Structured"
                  ? "bg-clozr-surface-soft text-clozr-secondary border border-clozr-border"
                  : artifact.status === "Ready for export"
                    ? "bg-clozr-accent-soft text-clozr-coral border border-clozr-accent-border"
                    : "bg-clozr-surface-soft text-clozr-muted"
              )}
            >
              {artifact.status}
            </span>
          </li>
        ))}
      </ul>
      {result.workflow_trace ? (
        <details className="mt-5 group">
          <summary className="text-xs text-clozr-muted cursor-pointer hover:text-clozr-primary">
            View workflow trace JSON
          </summary>
          <pre className="mt-2 text-[10px] font-mono overflow-x-auto rounded-lg border border-clozr-border bg-clozr-surface p-3 text-clozr-secondary max-h-48">
            {JSON.stringify(result.workflow_trace, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

export function StreamingOutcome({
  result,
  started,
}: {
  result: EcommerceLaunchResponse;
  started: boolean;
}) {
  const sections = buildOutcomeSections(result);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  useEffect(() => {
    if (started) {
      setSectionIndex(0);
      setAllComplete(false);
    }
  }, [started, result]);

  if (!started) {
    return (
      <div className="flex items-center gap-2 text-sm text-clozr-secondary">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-clozr-coral/60 animate-pulse" />
        Preparing coordinated outcome…
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 pb-8 border-b border-clozr-border">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-clozr-muted">
          Coordinated outcome
        </p>
        <h2 className="mt-3 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-clozr-primary">
          Goal Execution Result
        </h2>
        <p className="mt-3 text-sm text-clozr-secondary">
          Evidence assembled from multi-agent coordination across the CLOZR
          network — not a single-model response.
        </p>
      </header>

      <NetworkRoutingSummary result={result} />

      <div className="space-y-0">
        {sections.map((section, i) => (
          <StreamingSection
            key={section.id}
            title={section.title}
            content={section.content}
            active={i <= sectionIndex}
            onFinished={() => {
              if (i < sections.length - 1) {
                setSectionIndex((prev) => Math.max(prev, i + 1));
              } else {
                setAllComplete(true);
              }
            }}
          />
        ))}
      </div>

      <StructuredArtifacts result={result} visible={allComplete} />

      {allComplete ? (
        <p className="text-xs text-clozr-muted pt-8 border-t border-clozr-border animate-in fade-in duration-500">
          Coordination complete — goal decomposed, routed, and assembled through
          the network.
        </p>
      ) : null}
    </div>
  );
}
