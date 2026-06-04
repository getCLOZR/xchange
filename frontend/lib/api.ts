import axios, { isAxiosError } from "axios";

import type {
  ActivityListResponse,
  Agent,
  AgentListResponse,
  AgentRegisterRequest,
  AgentSearchResponse,
  BulkHealthCheckResponse,
  CapabilityGroup,
  CapabilityRegistryResponse,
  ContractValidationResponse,
  DispatchRequest,
  DispatchResponse,
  EndpointValidationResponse,
  HealthResponse,
  HealthCheckResponse,
  RoutingPreviewResponse,
  SessionRoutingResponse,
  Session,
  SessionListResponse,
  WorkflowListResponse,
} from "@/types";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function searchAgentsByCapability(
  capability: string
): Promise<AgentSearchResponse> {
  const { data } = await api.get<AgentSearchResponse>("/agents/search", {
    params: { capability },
  });
  return data;
}

export async function getCapabilities(): Promise<CapabilityRegistryResponse> {
  const { data } = await api.get<CapabilityRegistryResponse>("/capabilities/");
  return data;
}

export async function getCapability(name: string): Promise<CapabilityGroup> {
  const { data } = await api.get<CapabilityGroup>(
    `/capabilities/${encodeURIComponent(name)}`
  );
  return data;
}

export async function getAgents(params?: {
  active?: boolean;
  healthy?: boolean;
  limit?: number;
}): Promise<AgentListResponse> {
  const { data } = await api.get<AgentListResponse>("/agents", { params });
  return data;
}

export async function registerAgent(
  payload: AgentRegisterRequest
): Promise<Agent> {
  const { data } = await api.post<Agent>("/agents/register", payload);
  return data;
}

export async function validateEndpoint(
  endpointUrl: string
): Promise<EndpointValidationResponse> {
  const { data } = await api.post<EndpointValidationResponse>(
    "/validation/endpoint",
    { endpoint_url: endpointUrl },
    { timeout: 15_000 }
  );
  return data;
}

export async function validateContract(
  endpointUrl: string
): Promise<ContractValidationResponse> {
  const { data } = await api.post<ContractValidationResponse>(
    "/validation/contract",
    { endpoint_url: endpointUrl },
    { timeout: 15_000 }
  );
  return data;
}

export async function checkAgentHealth(
  agentId: number
): Promise<HealthCheckResponse> {
  const { data } = await api.post<HealthCheckResponse>(
    `/agents/${agentId}/health-check`
  );
  return data;
}

export async function checkAllAgentsHealth(): Promise<BulkHealthCheckResponse> {
  const { data } = await api.post<BulkHealthCheckResponse>(
    "/agents/health-check"
  );
  return data;
}

export async function getRecentWorkflows(
  limit = 20
): Promise<WorkflowListResponse> {
  const { data } = await api.get<WorkflowListResponse>("/workflows/recent", {
    params: { limit },
  });
  return data;
}

export async function getActivity(
  limit = 50
): Promise<ActivityListResponse> {
  const { data } = await api.get<ActivityListResponse>("/activity", {
    params: { limit },
  });
  return data;
}

export async function getSessions(params?: {
  status?: string;
  capability?: string;
  limit?: number;
}): Promise<SessionListResponse> {
  const { data } = await api.get<SessionListResponse>("/sessions", {
    params,
  });
  return data;
}

export async function getSession(sessionId: number): Promise<Session> {
  const { data } = await api.get<Session>(`/sessions/${sessionId}`);
  return data;
}

export async function getSessionRouting(
  sessionId: number
): Promise<SessionRoutingResponse> {
  const { data } = await api.get<SessionRoutingResponse>(
    `/sessions/${sessionId}/routing`
  );
  return data;
}

export async function getRoutingPreview(
  capability: string,
  options?: { requesterAgentId?: number }
): Promise<RoutingPreviewResponse> {
  const { data } = await api.get<RoutingPreviewResponse>("/routing/preview", {
    params: {
      capability,
      ...(options?.requesterAgentId != null
        ? { requester_agent_id: options.requesterAgentId }
        : {}),
    },
  });
  return data;
}

export async function dispatchSessionTask(
  payload: DispatchRequest
): Promise<DispatchResponse> {
  const { data } = await api.post<DispatchResponse>(
    "/sessions/dispatch",
    payload,
    { timeout: 60_000 }
  );
  return data;
}

/** Alias for developer console dispatch form. */
export const dispatchTask = dispatchSessionTask;

/** Alias for single-agent health check. */
export const checkAgentHealthById = checkAgentHealth;

/** Alias for bulk health check. */
export const checkAllAgentHealth = checkAllAgentsHealth;

export function getApiBaseUrl(): string {
  return baseURL;
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return `Backend unavailable at ${baseURL}. Is the API running?`;
    }
    const status = error.response.status;
    const detail = error.response.data?.detail;
    if (typeof detail === "string") {
      return formatKnownApiError(detail, status);
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: string }).msg);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
    if (detail && typeof detail === "object") {
      if ("message" in detail && typeof detail.message === "string") {
        return formatKnownApiError(detail.message, status);
      }
      return JSON.stringify(detail);
    }
    if (status === 404) return "Resource not found (404)";
    if (status >= 500) return `Server error (${status}). Check API logs.`;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed";
}

function formatKnownApiError(message: string, status: number): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("no healthy worker") ||
    lower.includes("no active worker") ||
    lower.includes("no worker")
  ) {
    return `${message} — register a worker, health-check it, then retry.`;
  }
  if (lower.includes("unreachable") || lower.includes("connection")) {
    return `${message} — verify endpoint_url (localhost vs Docker service name).`;
  }
  if (status === 422) return `Validation error: ${message}`;
  return message;
}
