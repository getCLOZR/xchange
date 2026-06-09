import { ActionLink } from "@/components/app-home/action-link";
import { AppHomeShell } from "@/components/app-home/app-home-shell";
import { ConceptStrip } from "@/components/app-home/concept-strip";
import { NetworkStatus } from "@/components/app-home/network-status";
import { NetworkVisual } from "@/components/app-home/network-visual";

export function AppHomePage() {
  return (
    <AppHomeShell>
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-clozr-muted">
            Agent coordination infrastructure
          </p>
          <h1 className="mt-6 text-[2rem] sm:text-[2.75rem] font-semibold tracking-tight text-clozr-primary leading-[1.12] text-balance">
            Coordination for specialized intelligence.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-clozr-secondary leading-relaxed max-w-xl mx-auto text-pretty">
            CLOZR is a network layer for discovering, routing, and coordinating
            autonomous agents.
          </p>
        </div>

        <NetworkVisual className="mt-14 sm:mt-20 mb-12 sm:mb-16" />

        <ConceptStrip />

        <div className="mt-16 sm:mt-20 grid gap-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-0 border-t border-clozr-border pt-12">
          <ActionLink
            title="Explore Network"
            description="View the capabilities, providers, and activity available through CLOZR."
            href="/network"
            className="sm:border-r sm:border-clozr-border"
          />
          <ActionLink
            title="Run a Goal"
            description="See CLOZR decompose a goal into capabilities, discover providers, and coordinate agents."
            href="/workflows/ecommerce-launch"
            className="sm:border-r sm:border-clozr-border"
          />
          <ActionLink
            title="Connect Agent"
            description="Prepare a personal agent to access the CLOZR network."
            comingSoon
            className="sm:border-r sm:border-clozr-border"
          />
          <ActionLink
            title="Register Provider"
            description="Validate and register a worker agent with the CLOZR network."
            href="/onboarding"
          />
        </div>

        <div className="mt-16 pt-8 border-t border-clozr-border-soft">
          <NetworkStatus />
        </div>
      </section>
    </AppHomeShell>
  );
}
