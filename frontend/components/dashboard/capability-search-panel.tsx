"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchAgentsByCapability } from "@/lib/api";
import type { Agent } from "@/types";

interface CapabilitySearchPanelProps {
  onAgentsFound: (agents: Agent[]) => void;
}

export function CapabilitySearchPanel({
  onAgentsFound,
}: CapabilitySearchPanelProps) {
  const [capability, setCapability] = useState("seo_optimization");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const name = capability.trim();
    if (!name) return;

    setLoading(true);
    setError(null);
    try {
      const result = await searchAgentsByCapability(name);
      setAgents(result.agents);
      onAgentsFound(result.agents);
    } catch (err) {
      setAgents([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          Capability search
        </CardTitle>
        <CardDescription>
          GET /agents/search?capability= — discovery routing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="capability name"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            aria-label="Capability name"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "…" : "Search"}
          </Button>
        </form>

        {error && (
          <p className="text-xs text-amber-400/90 font-mono">{error}</p>
        )}

        <p className="text-xs text-muted-foreground">
          {agents.length} agent{agents.length === 1 ? "" : "s"} matched
        </p>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="p-2 font-medium">ID</th>
                <th className="p-2 font-medium">Agent</th>
                <th className="p-2 font-medium">Version</th>
                <th className="p-2 font-medium">Capabilities</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No results — try another capability or register an agent
                  </td>
                </tr>
              )}
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-border/50 hover:bg-muted/20"
                >
                  <td className="p-2 font-mono">{agent.id}</td>
                  <td className="p-2">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-muted-foreground truncate max-w-[180px]">
                      {agent.endpoint_url}
                    </div>
                  </td>
                  <td className="p-2 font-mono">{agent.version}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((c) => (
                        <Badge key={c.id} variant="outline">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge variant={agent.is_active ? "success" : "muted"}>
                      {agent.is_active ? "active" : "off"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
