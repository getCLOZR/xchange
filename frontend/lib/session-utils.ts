import type { SessionStatus } from "@/types";

const SESSION_EVENT_TYPES = new Set([
  "session_created",
  "worker_selected",
  "task_dispatched",
  "task_completed",
  "task_failed",
]);

export function isOrchestrationEvent(eventType: string): boolean {
  return SESSION_EVENT_TYPES.has(eventType);
}

export function sessionStatusBadgeVariant(
  status: string
): "success" | "warning" | "secondary" | "muted" | "default" {
  switch (status as SessionStatus) {
    case "completed":
      return "success";
    case "failed":
      return "warning";
    case "running":
      return "default";
    case "pending":
      return "secondary";
    default:
      return "muted";
  }
}
