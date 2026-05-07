import { apiClient } from "@/lib/apiClient";
import type { PaginatedResponse, QueryListParams, User } from "@/types/common";

export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...usersKeys.lists(), params] as const,
  detail: (id: string) => [...usersKeys.all, "detail", id] as const,
};

export async function getUsers(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<User>>("/users/", { params });
  return response.data;
}

export async function getUser(id: string) {
  const response = await apiClient.get<User>(`/users/${id}/`);
  return response.data;
}

export async function createUser(payload: Record<string, unknown>) {
  const response = await apiClient.post<User>("/users/", payload);
  return response.data;
}

export async function updateUser(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<User>(`/users/${id}/`, payload);
  return response.data;
}

export async function activateUser(id: string) {
  const response = await apiClient.post<User>(`/users/${id}/activate/`);
  return response.data;
}

export async function suspendUser(id: string) {
  const response = await apiClient.post<User>(`/users/${id}/suspend/`);
  return response.data;
}
