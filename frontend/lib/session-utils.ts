import type { SessionStatus } from "@/types";

const SESSION_EVENT_TYPES = new Set([
  "session_created",
  "worker_selected",
  "worker_selection_failed",
  "task_dispatched",
  "task_completed",
  "task_failed",
  "task_failed_attempt",
  "invalid_worker_response",
]);

const WORKFLOW_EVENT_TYPES = new Set([
  "workflow_started",
  "workflow_step_started",
  "workflow_step_completed",
  "workflow_completed",
  "workflow_failed",
]);

export function isOrchestrationEvent(eventType: string): boolean {
  return SESSION_EVENT_TYPES.has(eventType);
}

export function isWorkflowEvent(eventType: string): boolean {
  return WORKFLOW_EVENT_TYPES.has(eventType);
}

export function workflowStatusBadgeVariant(
  status: string
): "success" | "warning" | "secondary" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "warning";
    case "in_progress":
    case "running":
      return "default";
    default:
      return "secondary";
  }
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
