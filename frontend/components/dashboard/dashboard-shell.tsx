import { PlatformShell } from "@/components/platform/platform-shell";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <PlatformShell
      footer={
        <p className="text-xs text-muted-foreground font-mono">
          Developer Console — internal testing environment (not production UI)
        </p>
      }
    >
      {children}
    </PlatformShell>
  );
}
