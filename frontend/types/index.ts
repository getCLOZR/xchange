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

export interface Agent {
  id: number;
  name: string;
  description: string;
  endpoint_url: string;
  owner_name: string;
  version: string;
  cost_credits: number;
  is_active: boolean;
  created_at: string;
  capabilities: Capability[];
}

export interface AgentSearchResponse {
  agents: Agent[];
  count: number;
}

export interface ActivityLog {
  id: number;
  event_type: string;
  message: string;
  agent_id: number | null;
  created_at: string;
}

export interface ActivityListResponse {
  activity: ActivityLog[];
  count: number;
}

export type SessionStatus = "pending" | "running" | "completed" | "failed";

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
}
