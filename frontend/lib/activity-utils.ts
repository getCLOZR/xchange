import { isOrchestrationEvent, isWorkflowEvent } from "@/lib/session-utils";

export type ActivityCategory =
  | "registration"
  | "health"
  | "routing"
  | "dispatch"
  | "workflow"
  | "failure"
  | "other";

const HEALTH_EVENTS = new Set([
  "worker_health_check_passed",
  "worker_health_check_failed",
]);

const ROUTING_EVENTS = new Set([
  "worker_selected",
  "worker_selection_failed",
]);

const FAILURE_EVENTS = new Set([
  "task_failed",
  "task_failed_attempt",
  "invalid_worker_response",
  "worker_health_check_failed",
  "worker_selection_failed",
  "workflow_failed",
]);

export function getActivityEventCategory(eventType: string): ActivityCategory {
  if (eventType === "agent_registered") return "registration";
  if (isWorkflowEvent(eventType)) return "workflow";
  if (HEALTH_EVENTS.has(eventType)) return "health";
  if (FAILURE_EVENTS.has(eventType)) return "failure";
  if (ROUTING_EVENTS.has(eventType)) return "routing";
  if (isOrchestrationEvent(eventType)) return "dispatch";
  return "other";
}

export function activityCategoryLabel(category: ActivityCategory): string {
  switch (category) {
    case "registration":
      return "Registration";
    case "health":
      return "Health";
    case "routing":
      return "Routing";
    case "dispatch":
      return "Dispatch";
    case "workflow":
      return "Workflow";
    case "failure":
      return "Failure";
    default:
      return "Other";
  }
}

export function activityCategoryDotClass(category: ActivityCategory): string {
  switch (category) {
    case "registration":
      return "border-sky-500 bg-sky-500/25";
    case "health":
      return "border-emerald-500 bg-emerald-500/25";
    case "routing":
      return "border-amber-500 bg-amber-500/25";
    case "dispatch":
      return "border-primary bg-primary/20";
    case "workflow":
      return "border-violet-500 bg-violet-500/25";
    case "failure":
      return "border-red-500 bg-red-500/25";
    default:
      return "border-muted-foreground/40";
  }
}

export function activityCategoryBadgeClass(category: ActivityCategory): string {
  switch (category) {
    case "registration":
      return "border-sky-500/40 text-sky-300";
    case "health":
      return "border-emerald-500/40 text-emerald-300";
    case "routing":
      return "border-amber-500/40 text-amber-300";
    case "dispatch":
      return "";
    case "workflow":
      return "border-violet-500/40 text-violet-300";
    case "failure":
      return "border-red-500/40 text-red-300";
    default:
      return "";
  }
}
