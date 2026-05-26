"use client";

import { ScrollText, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePoll } from "@/hooks/use-poll";
import { getActivity, getApiErrorMessage } from "@/lib/api";
import { isOrchestrationEvent } from "@/lib/session-utils";
import { cn, formatTimestamp } from "@/lib/utils";
import type { ActivityLog } from "@/types";

interface ActivityLogPanelProps {
  refreshKey?: number;
}

export function ActivityLogPanel({ refreshKey = 0 }: ActivityLogPanelProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    setError(null);
    try {
      const data = await getActivity();
      setLogs(data.activity);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  usePoll(fetchActivity, [refreshKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Activity log
          </CardTitle>
          <CardDescription>
            GET /activity — orchestration timeline (auto-refresh 5s)
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchActivity();
          }}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-xs text-amber-400/90 font-mono">{error}</p>
        )}
        <div className="overflow-x-auto rounded-md border border-border max-h-80 overflow-y-auto">
          {!loading && logs.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No orchestration activity yet.
            </p>
          ) : (
            <ul className="relative p-2">
              {logs.map((log, index) => {
                const orchestration = isOrchestrationEvent(log.event_type);
                const isLast = index === logs.length - 1;
                return (
                  <li
                    key={log.id}
                    className={cn(
                      "relative flex gap-3 pb-4 pl-4",
                      !isLast &&
                        "before:absolute before:left-[7px] before:top-3 before:h-[calc(100%-4px)] before:w-px before:bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-background",
                        orchestration
                          ? "border-primary bg-primary/20"
                          : "border-muted-foreground/40"
                      )}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(log.created_at)}
                        </span>
                        <Badge
                          variant={orchestration ? "default" : "outline"}
                          className="font-mono text-[10px]"
                        >
                          {log.event_type}
                        </Badge>
                        {log.agent_id != null && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            agent {log.agent_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed">{log.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
