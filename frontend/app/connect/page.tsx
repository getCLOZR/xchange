import Link from "next/link";

import { AppHomeShell } from "@/components/app-home/app-home-shell";

export const metadata = {
  title: "Connect Agent — Gleam",
  description: "Prepare a personal agent to access the Gleam network",
};

export default function ConnectPage() {
  return (
    <AppHomeShell>
      <div className="mx-auto max-w-lg px-5 py-24 sm:px-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Connect Agent
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Coming soon
        </h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Personal agent connection to the Gleam network is in development. For
          now, register a provider or use the developer console to explore
          coordination.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <Link
            href="/onboarding"
            className="text-foreground font-medium hover:opacity-70 transition-opacity"
          >
            Register a provider →
          </Link>
          <Link
            href="/app"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </AppHomeShell>
  );
}
