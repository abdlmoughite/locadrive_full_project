import { apiClient } from "@/lib/apiClient";
import type { Maintenance, PaginatedResponse, QueryListParams } from "@/types/common";

export const maintenanceKeys = {
  all: ["maintenance"] as const,
  list: (params: QueryListParams) => [...maintenanceKeys.all, "list", params] as const,
  detail: (id: string) => [...maintenanceKeys.all, "detail", id] as const,
};

export async function getMaintenanceRecords(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Maintenance>>("/maintenance/", { params });
  return response.data;
}

export async function getMaintenanceRecord(id: string) {
  const response = await apiClient.get<Maintenance>(`/maintenance/${id}/`);
  return response.data;
}

export async function createMaintenanceRecord(payload: Record<string, unknown>) {
  const response = await apiClient.post<Maintenance>("/maintenance/", payload);
  return response.data;
}

export async function updateMaintenanceRecord(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Maintenance>(`/maintenance/${id}/`, payload);
  return response.data;
}

export async function completeMaintenanceRecord(id: string) {
  const response = await apiClient.post<Maintenance>(`/maintenance/${id}/complete/`);
  return response.data;
}

export async function cancelMaintenanceRecord(id: string) {
  const response = await apiClient.post<Maintenance>(`/maintenance/${id}/cancel/`);
  return response.data;
}
