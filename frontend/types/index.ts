export interface HealthResponse {
  status: string;
  service: string;
}

export interface Capability {
  id: number;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
}

export interface CapabilityCreateInput {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
}

export interface AgentRegisterRequest {
  name: string;
  description: string;
  endpoint_url: string;
  owner_name: string;
  version: string;
  cost_credits: number;
  is_active: boolean;
  capabilities: CapabilityCreateInput[];
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  endpoint_url: string;
  owner_name: string;
  version: string;
  cost_credits: number;
  is_active: boolean;
  is_healthy: boolean;
  last_health_check: string | null;
  last_seen_at: string | null;
  avg_response_time_ms: number | null;
  total_sessions: number;
  successful_sessions: number;
  failed_sessions: number;
  created_at: string;
  capabilities: Capability[];
}

export interface AgentListResponse {
  agents: Agent[];
  count: number;
}

export interface AgentSearchResponse {
  agents: Agent[];
  count: number;
}

export interface AgentHealthStatus {
  agent_id: number;
  name: string;
  endpoint_url: string;
  active: boolean;
  is_healthy: boolean;
  last_health_check: string | null;
  last_seen_at: string | null;
  avg_response_time_ms: number | null;
  total_sessions: number;
  successful_sessions: number;
  failed_sessions: number;
}

export interface HealthCheckResponse {
  agent_id: number;
  is_healthy: boolean;
  response_time_ms: number | null;
  checked_at: string;
  error_message: string | null;
}

export interface BulkHealthCheckResponse {
  checked_count: number;
  healthy_count: number;
  unhealthy_count: number;
  results: HealthCheckResponse[];
}

export interface ActivityLog {
  id: number;
  event_type: string;
  message: string;
  agent_id: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkflowStepTrace {
  step_index: number;
  capability: string;
  task_type?: string | null;
  session_id: number | null;
  worker_agent_id?: number | null;
  status: string;
}

export interface WorkflowTrace {
  workflow_id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  steps: WorkflowStepTrace[];
  question?: string | null;
}

export interface WorkflowListResponse {
  workflows: WorkflowTrace[];
  count: number;
}

export interface ActivityListResponse {
  activity: ActivityLog[];
  count: number;
}

export type SessionStatus = "pending" | "running" | "completed" | "failed";

export interface RoutingCandidateScore {
  agent_id: number;
  name: string;
  success_rate: number;
  avg_response_time_ms: number | null;
  cost_credits: number;
  is_healthy: boolean;
  score: number;
  score_breakdown: Record<string, number>;
}

export interface RoutingPreviewResponse {
  capability: string;
  filters: string[];
  candidates: RoutingCandidateScore[];
  selected_agent_id: number | null;
  selection_reason: string;
  routing_trace: Record<string, unknown>;
}

export interface RoutingAttempt {
  agent_id: number;
  name?: string;
  score?: number;
  outcome: string;
  error?: string;
  response_time_ms?: number;
}

export interface RoutingTrace {
  capability?: string;
  filters?: string[];
  candidates?: Record<string, unknown>[];
  selected_agent_id?: number | null;
  selection_reason?: string;
  attempts?: RoutingAttempt[];
}

export interface Session {
  id: number;
  requester_agent_id: number;
  worker_agent_id: number | null;
  capability: string;
  task_type: string;
  status: SessionStatus | string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  routing_trace?: RoutingTrace | Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: Session[];
  count: number;
}

export interface DispatchRequest {
  requester_agent_id: number;
  capability: string;
  task_type: string;
  input_payload: Record<string, unknown>;
}

export interface DispatchResponse {
  session_id: number;
  status: string;
  worker_agent_id: number | null;
  capability: string;
  task_type: string;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  routing_trace?: RoutingTrace | Record<string, unknown> | null;
}
