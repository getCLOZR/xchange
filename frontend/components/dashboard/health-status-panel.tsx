"use client";

import { RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getApiBaseUrl, getHealth } from "@/lib/api";
import type { HealthResponse } from "@/types";

type ConnectionState = "checking" | "connected" | "error";

export function HealthStatusPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setConnection("checking");
    setError(null);
    try {
      const data = await getHealth();
      setHealth(data);
      setConnection("connected");
    } catch (e) {
      setHealth(null);
      setConnection("error");
      setError(e instanceof Error ? e.message : "Failed to reach API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Health & connectivity
          </CardTitle>
          <CardDescription>GET /health — exchange API probe</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">API status</p>
          {connection === "checking" && (
            <Badge variant="muted">checking…</Badge>
          )}
          {connection === "connected" && health && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{health.status}</Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {health.service}
              </span>
            </div>
          )}
          {connection === "error" && (
            <Badge variant="warning">unreachable</Badge>
          )}
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">
            Backend connection
          </p>
          <Badge
            variant={
              connection === "connected"
                ? "success"
                : connection === "error"
                  ? "warning"
                  : "muted"
            }
          >
            {connection === "connected"
              ? "connected"
              : connection === "error"
                ? "disconnected"
                : "checking"}
          </Badge>
          <p className="mt-2 text-xs font-mono text-muted-foreground truncate">
            {getApiBaseUrl()}
          </p>
        </div>
        {error && (
          <p className="sm:col-span-2 text-xs text-amber-400/90 font-mono">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
