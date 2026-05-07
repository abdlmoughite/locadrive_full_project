import { apiClient } from "@/lib/apiClient";
import type { Agency, PaginatedResponse, QueryListParams, Subscription } from "@/types/common";

export const agenciesKeys = {
  all: ["agencies"] as const,
  lists: () => [...agenciesKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...agenciesKeys.lists(), params] as const,
  detail: (id: string) => [...agenciesKeys.all, "detail", id] as const,
  mine: () => [...agenciesKeys.all, "mine"] as const,
  subscriptions: ["subscriptions"] as const,
};

export async function getAgencies(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Agency>>("/agencies/", { params });
  return response.data;
}

export async function getAgency(id: string) {
  const response = await apiClient.get<Agency>(`/agencies/${id}/`);
  return response.data;
}

export async function getMyAgency() {
  const response = await apiClient.get<Agency>("/agencies/mine/");
  return response.data;
}

export async function createAgency(payload: Partial<Agency>) {
  const response = await apiClient.post<Agency>("/agencies/", payload);
  return response.data;
}

export async function updateAgency(id: string, payload: Partial<Agency>) {
  const response = await apiClient.patch<Agency>(`/agencies/${id}/`, payload);
  return response.data;
}

export async function getSubscriptions(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Subscription>>("/subscriptions/", { params });
  return response.data;
}

export async function createSubscription(payload: Record<string, unknown>) {
  const response = await apiClient.post<Subscription>("/subscriptions/", payload);
  return response.data;
}

export async function updateSubscription(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Subscription>(`/subscriptions/${id}/`, payload);
  return response.data;
}
