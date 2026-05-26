import { Activity, Boxes, Network, Terminal } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                CLOZR Exchange
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                internal control panel
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground font-mono">
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
        <p className="text-xs text-muted-foreground font-mono">
          MVP developer dashboard — not production UI
        </p>
      </footer>
    </div>
  );
}
