"use client";

import { useCallback, useState } from "react";

import { ActivityLogPanel } from "@/components/dashboard/activity-log-panel";
import { ArchitectureNotes } from "@/components/dashboard/architecture-notes";
import { CapabilitySearchPanel } from "@/components/dashboard/capability-search-panel";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HealthStatusPanel } from "@/components/dashboard/health-status-panel";
import { RegisteredAgentsPanel } from "@/components/dashboard/registered-agents-panel";
import { RoutingPanel } from "@/components/dashboard/routing-panel";
import { RunTaskDemoPanel } from "@/components/dashboard/run-task-demo-panel";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";
import type { Agent } from "@/types";

export function Dashboard() {
  const [discoveredAgents, setDiscoveredAgents] = useState<Agent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAgentsFound = useCallback((agents: Agent[]) => {
    setDiscoveredAgents((prev) => {
      const byId = new Map(prev.map((a) => [a.id, a]));
      for (const agent of agents) {
        byId.set(agent.id, agent);
      }
      return Array.from(byId.values());
    });
  }, []);

  const handleDispatchComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Exchange control panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize agents, capability routing, orchestration flow, and
            infrastructure logs.
          </p>
        </div>

        <HealthStatusPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <RegisteredAgentsPanel discoveredAgents={discoveredAgents} />
          <CapabilitySearchPanel onAgentsFound={handleAgentsFound} />
        </div>

        <RoutingPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <RunTaskDemoPanel onDispatchComplete={handleDispatchComplete} />
          <ArchitectureNotes />
        </div>

        <SessionsPanel refreshKey={refreshKey} />

        <ActivityLogPanel refreshKey={refreshKey} />
      </div>
    </DashboardShell>
  );
}
