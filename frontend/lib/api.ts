import axios, { isAxiosError } from "axios";

import type {
  ActivityListResponse,
  AgentSearchResponse,
  DispatchRequest,
  DispatchResponse,
  HealthResponse,
  Session,
  SessionListResponse,
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

export function getApiBaseUrl(): string {
  return baseURL;
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      if ("message" in detail && typeof detail.message === "string") {
        return detail.message;
      }
      return JSON.stringify(detail);
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed";
}
