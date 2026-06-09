"use client";

import { Activity, Boxes, Network, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getApiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "App Home", description: "network" },
  { href: "/", label: "Developer Console", description: "internal testing" },
  { href: "/onboarding", label: "Agent Onboarding", description: "external developers" },
] as const;

export function PlatformShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted">
                <Network className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  CLOZR Exchange
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  agent coordination platform
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : item.href === "/app"
                      ? pathname === "/app" || pathname === "/network"
                      : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                      · {item.description}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-3 hidden sm:flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              API {getApiBaseUrl()}
            </span>
            <span className="flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" />
              orchestration
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              observability
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-7xl border-t border-border px-4 py-4 sm:px-6">
        {footer ?? (
          <p className="text-xs text-muted-foreground font-mono">
            CLOZR Exchange — developer tooling
          </p>
        )}
      </footer>
    </div>
  );
}
