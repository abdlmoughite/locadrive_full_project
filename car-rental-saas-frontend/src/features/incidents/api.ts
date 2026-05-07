import { apiClient } from "@/lib/apiClient";
import type { Incident, PaginatedResponse, QueryListParams } from "@/types/common";

export const incidentsKeys = {
  all: ["incidents"] as const,
  list: (params: QueryListParams) => [...incidentsKeys.all, "list", params] as const,
  detail: (id: string) => [...incidentsKeys.all, "detail", id] as const,
};

export async function getIncidents(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Incident>>("/incidents/", { params });
  return response.data;
}

export async function getIncident(id: string) {
  const response = await apiClient.get<Incident>(`/incidents/${id}/`);
  return response.data;
}

export async function createIncident(payload: Record<string, unknown>) {
  const response = await apiClient.post<Incident>("/incidents/", payload);
  return response.data;
}

export async function updateIncident(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Incident>(`/incidents/${id}/`, payload);
  return response.data;
}

export async function resolveIncident(id: string) {
  const response = await apiClient.post<Incident>(`/incidents/${id}/resolve/`);
  return response.data;
}
