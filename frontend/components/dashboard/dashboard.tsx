"use client";

import { useCallback, useState } from "react";

import { ActivityLogPanel } from "@/components/dashboard/activity-log-panel";
import { CapabilityRegistryPanel } from "@/components/dashboard/capability-registry-panel";
import { CapabilitySearchPanel } from "@/components/dashboard/capability-search-panel";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HealthStatusPanel } from "@/components/dashboard/health-status-panel";
import { RegisterAgentPanel } from "@/components/dashboard/register-agent-panel";
import { RegisteredAgentsPanel } from "@/components/dashboard/registered-agents-panel";
import { RoutingPanel } from "@/components/dashboard/routing-panel";
import { RoutingTransparencyPanel } from "@/components/dashboard/routing-transparency-panel";
import { RunTaskDemoPanel } from "@/components/dashboard/run-task-demo-panel";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";
import { WorkflowActivityPanel } from "@/components/dashboard/workflow-activity-panel";
import type { Agent } from "@/types";

export function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightSessionId, setHighlightSessionId] = useState<number | null>(
    null
  );
  const [lastRegisteredId, setLastRegisteredId] = useState<string>("1");

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAgentRegistered = useCallback((agent: Agent) => {
    setLastRegisteredId(String(agent.id));
    bumpRefresh();
  }, [bumpRefresh]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            CLOZR developer console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register agents, run health checks, preview routing, dispatch tasks,
            and inspect sessions — without curl.
          </p>
        </div>

        <HealthStatusPanel />

        <CapabilityRegistryPanel refreshKey={refreshKey} />

        <div className="grid gap-6 lg:grid-cols-2">
          <RegisterAgentPanel onRegistered={handleAgentRegistered} />
          <RegisteredAgentsPanel
            refreshKey={refreshKey}
            onHealthCheck={bumpRefresh}
          />
        </div>

        <RoutingTransparencyPanel />

        <RoutingPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <RunTaskDemoPanel
            defaultRequesterId={lastRegisteredId}
            onDispatchComplete={bumpRefresh}
          />
          <CapabilitySearchPanel />
        </div>

        <WorkflowActivityPanel
          refreshKey={refreshKey}
          onSelectSession={(sessionId) => {
            setHighlightSessionId(sessionId);
            bumpRefresh();
          }}
        />

        <SessionsPanel
          refreshKey={refreshKey}
          highlightSessionId={highlightSessionId}
        />

        <ActivityLogPanel refreshKey={refreshKey} />
      </div>
    </DashboardShell>
  );
}
