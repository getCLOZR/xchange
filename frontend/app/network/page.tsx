import { AppHomeShell } from "@/components/app-home/app-home-shell";
import { CapabilityRegistryPanel } from "@/components/dashboard/capability-registry-panel";

export const metadata = {
  title: "Network — CLOZR",
  description: "Capabilities and providers on the CLOZR exchange",
};

export default function NetworkPage() {
  return (
    <AppHomeShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Network
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Capabilities and providers
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Discover what the exchange offers, who provides each capability, and
            how routing selects workers.
          </p>
        </header>
        <CapabilityRegistryPanel />
      </div>
    </AppHomeShell>
  );
}
