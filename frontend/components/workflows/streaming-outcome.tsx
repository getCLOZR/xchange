"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { buildRoutingSummary } from "@/lib/goal-coordination-demo";
import { cn } from "@/lib/utils";
import type { EcommerceLaunchResponse } from "@/types";

interface KeywordItem {
  keyword: string;
  intent?: string;
  rationale?: string;
  searchVolume?: string;
  cpc?: string;
  stage?: string;
  reasonForBidding?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function formatVolume(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value.toLocaleString();
  const s = String(value);
  if (!s || s === "emerging/untracked") return "Emerging";
  const n = Number(s);
  return Number.isFinite(n) ? n.toLocaleString() : s;
}

function formatCpc(value: unknown): string | undefined {
  if (value == null || value === "N/A") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
  return String(value);
}

function parseKeywords(items: unknown): KeywordItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const result: KeywordItem[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      const keyword = item.trim();
      if (keyword) result.push({ keyword });
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    const keyword = String(rec.keyword ?? "").trim();
    if (!keyword) continue;
    result.push({
      keyword,
      intent: typeof rec.intent === "string" ? rec.intent : undefined,
      rationale: typeof rec.rationale === "string" ? rec.rationale : undefined,
      searchVolume: formatVolume(rec.search_volume),
      cpc: formatCpc(rec.cpc),
      stage:
        typeof rec.buyer_journey_stage === "string"
          ? rec.buyer_journey_stage
          : undefined,
      reasonForBidding:
        typeof rec.reason_for_bidding === "string"
          ? rec.reason_for_bidding
          : undefined,
    });
  }
  return result;
}

interface SeoViewModel {
  title: string | null;
  strategy: string | null;
  metaDescription: string | null;
  amazonTerms: string[];
  primary: KeywordItem[];
  secondary: KeywordItem[];
  longTail: KeywordItem[];
  gaps: KeywordItem[];
  ppc: KeywordItem[];
}

function buildSeoViewModel(result: EcommerceLaunchResponse): SeoViewModel {
  const seo = asRecord(result.seo_agent_output);
  const empty: SeoViewModel = {
    title: null,
    strategy: null,
    metaDescription: null,
    amazonTerms: [],
    primary: [],
    secondary: [],
    longTail: [],
    gaps: [],
    ppc: [],
  };

  if (!seo) {
    return {
      ...empty,
      primary: result.primary_keywords.map((keyword) => ({ keyword })),
      longTail: result.long_tail_keywords.map((keyword) => ({ keyword })),
    };
  }

  const campaign = asRecord(seo.raw_campaign) ?? {};

  const primary =
    parseKeywords(campaign.primary_keywords).length > 0
      ? parseKeywords(campaign.primary_keywords)
      : parseKeywords(seo.primary_keywords);

  const longTail =
    parseKeywords(campaign.long_tail_keywords).length > 0
      ? parseKeywords(campaign.long_tail_keywords)
      : parseKeywords(seo.long_tail_keywords);

  const amazonRaw =
    typeof campaign.amazon_backend_search_terms === "string"
      ? campaign.amazon_backend_search_terms
      : "";

  return {
    title:
      (typeof seo.seo_angle === "string" && seo.seo_angle) ||
      (typeof campaign.recommended_title_structure === "string" &&
        campaign.recommended_title_structure) ||
      null,
    strategy:
      (typeof seo.search_intent === "string" && seo.search_intent) ||
      (typeof campaign.keyword_strategy_summary === "string" &&
        campaign.keyword_strategy_summary) ||
      null,
    metaDescription:
      typeof campaign.meta_description === "string"
        ? campaign.meta_description
        : null,
    amazonTerms: amazonRaw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean),
    primary,
    secondary: parseKeywords(campaign.secondary_keywords),
    longTail,
    gaps: parseKeywords(campaign.competitor_gap_keywords),
    ppc: parseKeywords(campaign.ppc_exact_match_targets),
  };
}

function stageTone(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("decision")) {
    return "border-[#c45a4a]/35 bg-[#ff6658]/10 text-[#9a3d32]";
  }
  if (s.includes("consideration")) {
    return "border-[#c4a574]/40 bg-[#f3e6d4]/70 text-[#7a5c2e]";
  }
  if (s.includes("awareness")) {
    return "border-clozr-border bg-[#eef2f6] text-[#3d4a5c]";
  }
  return "border-clozr-border bg-clozr-surface-soft text-clozr-secondary";
}

function MetricChip({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "stage" | "default";
}) {
  if (emphasis === "stage") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
          stageTone(value)
        )}
      >
        <span className="opacity-70 uppercase tracking-[0.14em] text-[9px]">
          {label}
        </span>
        <span className="font-semibold">{value}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-clozr-border bg-white/80 px-2.5 py-1 text-[11px] shadow-[0_1px_0_rgba(17,17,17,0.03)]">
      <span className="font-semibold uppercase tracking-[0.14em] text-[9px] text-clozr-muted">
        {label}
      </span>
      <span className="font-semibold tabular-nums text-clozr-primary">
        {value}
      </span>
    </span>
  );
}

function KeywordCard({ item }: { item: KeywordItem }) {
  const note = item.rationale || item.reasonForBidding;

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-clozr-border bg-gradient-to-br from-white to-[#faf8f5] px-4 py-4 shadow-[0_1px_2px_rgba(17,17,17,0.03)] transition-[border-color,box-shadow] hover:border-[#d8cfc3] hover:shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#ff6658]/80 via-[#ff6658]/25 to-transparent opacity-80" />
      <div className="pl-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[15px] sm:text-base font-semibold tracking-tight text-clozr-primary leading-snug">
            {item.keyword}
          </p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {item.searchVolume ? (
              <MetricChip label="Vol" value={item.searchVolume} />
            ) : null}
            {item.cpc ? <MetricChip label="CPC" value={item.cpc} /> : null}
            {item.stage ? (
              <MetricChip label="Stage" value={item.stage} emphasis="stage" />
            ) : null}
          </div>
        </div>

        {item.intent ? (
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-[#171412]/[0.035] px-2.5 py-1.5">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff6658]">
              Intent
            </span>
            <span className="text-[12px] font-medium text-clozr-secondary truncate">
              {item.intent}
            </span>
          </div>
        ) : null}

        {note ? (
          <p className="mt-3 text-[13.5px] leading-[1.7] text-clozr-secondary">
            {note}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Reveal({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-500",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  index,
  children,
}: {
  index?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      {index ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#171412] px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {index}
        </span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff6658]" />
      )}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-clozr-primary">
        {children}
      </p>
      <span className="h-px flex-1 bg-gradient-to-r from-clozr-border to-transparent" />
    </div>
  );
}

function KeywordGroup({
  index,
  title,
  items,
  show,
}: {
  index: string;
  title: string;
  items: KeywordItem[];
  show: boolean;
}) {
  if (!items.length) return null;
  return (
    <Reveal show={show} className="pt-9">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#171412] px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {index}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-clozr-primary">
          {title}
        </p>
        <span className="h-px flex-1 bg-gradient-to-r from-clozr-border to-transparent" />
        <span className="shrink-0 rounded-full border border-clozr-border bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-clozr-secondary">
          {items.length}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <KeywordCard key={`${title}-${item.keyword}`} item={item} />
        ))}
      </ul>
    </Reveal>
  );
}

function NetworkRoutingSummary({
  result,
}: {
  result: EcommerceLaunchResponse;
}) {
  const summary = buildRoutingSummary(result);
  const stats = [
    { label: "Capabilities", value: summary.capabilitiesRecognized },
    { label: "Providers", value: summary.providersSelected },
    { label: "Executions", value: summary.agentExecutions },
    { label: "Handoffs", value: summary.handoffs },
  ];

  return (
    <div className="mb-9 overflow-hidden rounded-2xl border border-clozr-border bg-white shadow-[0_1px_2px_rgba(17,17,17,0.03)]">
      <div className="flex items-center justify-between gap-3 border-b border-clozr-border-soft bg-[#faf8f5] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6658]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-clozr-primary">
            Network routing
          </p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-clozr-muted">
          Live run
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-clozr-border-soft">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white px-4 py-4 min-w-0">
            <p className="text-[22px] font-semibold tabular-nums tracking-tight text-clozr-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-clozr-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      {summary.workflowId ? (
        <p className="border-t border-clozr-border-soft px-4 py-2.5 text-[10px] font-mono text-clozr-muted truncate">
          {summary.workflowId}
        </p>
      ) : null}
    </div>
  );
}

export function StreamingOutcome({
  result,
  started,
}: {
  result: EcommerceLaunchResponse;
  started: boolean;
}) {
  const view = useMemo(() => buildSeoViewModel(result), [result]);
  const [step, setStep] = useState(0);

  const hasContent =
    Boolean(view.title) ||
    Boolean(view.strategy) ||
    view.primary.length > 0 ||
    view.secondary.length > 0 ||
    view.longTail.length > 0 ||
    view.gaps.length > 0 ||
    view.ppc.length > 0 ||
    Boolean(view.metaDescription) ||
    view.amazonTerms.length > 0;

  useEffect(() => {
    if (!started) {
      setStep(0);
      return;
    }
    setStep(0);
    const timers = [
      window.setTimeout(() => setStep(1), 200),
      window.setTimeout(() => setStep(2), 650),
      window.setTimeout(() => setStep(3), 1100),
      window.setTimeout(() => setStep(4), 1550),
      window.setTimeout(() => setStep(5), 2000),
      window.setTimeout(() => setStep(6), 2450),
      window.setTimeout(() => setStep(7), 2900),
      window.setTimeout(() => setStep(8), 3350),
      window.setTimeout(() => setStep(9), 3800),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
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
    <div className="relative">
      <header className="mb-9 pb-8 border-b border-clozr-border">
        <div className="inline-flex items-center gap-2 rounded-full border border-clozr-accent-border bg-clozr-accent-soft/70 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6658]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a3d32]">
            Coordinated outcome
          </span>
        </div>
        <h2 className="mt-4 text-[1.85rem] sm:text-[2rem] font-bold tracking-[-0.03em] text-clozr-primary leading-[1.15]">
          SEO campaign brief
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-clozr-secondary max-w-xl">
          Assembled from the live Gleam SEO Agent after network routing for{" "}
          <span className="font-semibold text-clozr-primary">seo_keywords</span>.
        </p>
      </header>

      <NetworkRoutingSummary result={result} />

      {!hasContent ? (
        <p className="text-sm text-clozr-secondary">
          No SEO agent output was returned for this run.
        </p>
      ) : null}

      {view.title ? (
        <Reveal show={step >= 1} className="mb-9">
          <SectionLabel index="01">Recommended title</SectionLabel>
          <div className="relative overflow-hidden rounded-2xl border border-[#171412]/10 bg-[#171412] px-5 py-6 sm:px-6 sm:py-7 shadow-[0_12px_32px_rgba(23,20,18,0.12)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#ff6658]/25 blur-2xl" />
            <p className="relative text-xl sm:text-[1.6rem] font-semibold tracking-[-0.02em] text-white leading-snug">
              {view.title}
            </p>
          </div>
        </Reveal>
      ) : null}

      {view.metaDescription ? (
        <Reveal show={step >= 2} className="mb-9">
          <SectionLabel index="02">Meta description</SectionLabel>
          <div className="rounded-2xl border border-clozr-border bg-white px-5 py-4 shadow-[0_1px_2px_rgba(17,17,17,0.03)]">
            <p className="text-[15px] leading-[1.75] text-clozr-secondary">
              {view.metaDescription}
            </p>
          </div>
        </Reveal>
      ) : null}

      {view.strategy ? (
        <Reveal show={step >= 3} className="mb-9">
          <SectionLabel index="03">Strategy</SectionLabel>
          <div className="rounded-2xl border border-clozr-border bg-[#faf8f5] px-5 py-4">
            <p className="text-[15px] leading-[1.75] text-clozr-secondary">
              {view.strategy}
            </p>
          </div>
        </Reveal>
      ) : null}

      <div>
        <KeywordGroup
          index="04"
          title="Primary keywords"
          items={view.primary}
          show={step >= 4}
        />
        <KeywordGroup
          index="05"
          title="Secondary keywords"
          items={view.secondary}
          show={step >= 5}
        />
        <KeywordGroup
          index="06"
          title="Long-tail keywords"
          items={view.longTail}
          show={step >= 6}
        />
        <KeywordGroup
          index="07"
          title="Competitor gaps"
          items={view.gaps}
          show={step >= 7}
        />
        <KeywordGroup
          index="08"
          title="PPC targets"
          items={view.ppc}
          show={step >= 8}
        />
      </div>

      {view.amazonTerms.length > 0 ? (
        <Reveal show={step >= 9} className="pt-9">
          <SectionLabel index="09">Amazon backend terms</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {view.amazonTerms.map((term) => (
              <span
                key={term}
                className="rounded-full border border-clozr-border bg-white px-3 py-1.5 text-[12px] font-medium text-clozr-primary shadow-[0_1px_0_rgba(17,17,17,0.03)]"
              >
                {term}
              </span>
            ))}
          </div>
        </Reveal>
      ) : null}

      {result.seo_agent_output && step >= 9 ? (
        <details className="mt-10 group">
          <summary className="text-xs font-medium text-clozr-muted cursor-pointer hover:text-clozr-primary list-none inline-flex items-center gap-2 rounded-full border border-clozr-border bg-white px-3 py-1.5">
            <span className="text-[#ff6658] group-open:rotate-90 transition-transform">
              ›
            </span>
            Raw agent JSON
          </summary>
          <pre className="mt-3 text-[10px] font-mono overflow-x-auto rounded-2xl border border-clozr-border bg-[#171412] p-4 text-[#d8d2ca] max-h-72">
            {JSON.stringify(result.seo_agent_output, null, 2)}
          </pre>
        </details>
      ) : null}

      {step >= 9 ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-clozr-muted pt-8 mt-8 border-t border-clozr-border animate-in fade-in duration-500">
          Coordination complete · Gleam SEO Agent
        </p>
      ) : null}
    </div>
  );
}
