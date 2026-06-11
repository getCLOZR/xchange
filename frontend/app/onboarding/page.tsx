import { AgentOnboardingWizard } from "@/components/onboarding/agent-onboarding-wizard";
import { PlatformShell } from "@/components/platform/platform-shell";

export const metadata = {
  title: "Agent Onboarding — Gleam",
  description:
    "Validate and register Gleam-compatible agents before joining the network",
};

export default function OnboardingPage() {
  return (
    <PlatformShell
      footer={
        <p className="text-xs text-muted-foreground font-mono">
          Agent Onboarding — external developer experience (v0.1)
        </p>
      }
    >
      <AgentOnboardingWizard />
    </PlatformShell>
  );
}
