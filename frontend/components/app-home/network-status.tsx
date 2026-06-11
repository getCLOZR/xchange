"use client";

import { useEffect, useState } from "react";

import { getCapabilities, getHealth } from "@/lib/api";

interface StatusLine {
  label: string;
  ok: boolean;
}

export function NetworkStatus() {
  const [lines, setLines] = useState<StatusLine[]>([
    { label: "Checking network…", ok: true },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [health, registry] = await Promise.all([
          getHealth(),
          getCapabilities(),
        ]);
        if (cancelled) return;

        const capabilityCount = registry.capabilities.length;
        const providerCount = registry.capabilities.reduce(
          (sum, g) => sum + g.provider_count,
          0
        );
        const healthyCount = registry.capabilities.reduce(
          (sum, g) => sum + g.healthy_provider_count,
          0
        );

        const next: StatusLine[] = [
          {
            label:
              health.status === "ok" ? "Network online" : "Network reachable",
            ok: health.status === "ok",
          },
        ];

        if (capabilityCount > 0) {
          next.push({
            label: `${capabilityCount} capabilit${capabilityCount === 1 ? "y" : "ies"} available`,
            ok: true,
          });
        } else {
          next.push({ label: "Capabilities registering", ok: true });
        }

        if (providerCount > 0) {
          next.push({
            label:
              healthyCount > 0
                ? `${healthyCount} of ${providerCount} providers healthy`
                : `${providerCount} providers registered`,
            ok: healthyCount > 0,
          });
        }

        setLines(next);
      } catch {
        if (!cancelled) {
          setLines([
            { label: "Network status unavailable", ok: false },
            { label: "Start the Gleam API to see live metrics", ok: true },
          ]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-clozr-muted">
      {lines.map((line, i) => (
        <span key={line.label} className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                line.ok ? "bg-clozr-coral" : "bg-clozr-border"
              }`}
              aria-hidden
            />
            {line.label}
          </span>
          {i < lines.length - 1 ? (
            <span className="hidden sm:inline text-border">·</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
