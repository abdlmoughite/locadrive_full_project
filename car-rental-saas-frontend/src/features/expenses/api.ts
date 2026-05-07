import { apiClient } from "@/lib/apiClient";
import type { Expense, PaginatedResponse, QueryListParams } from "@/types/common";

export const expensesKeys = {
  all: ["expenses"] as const,
  list: (params: QueryListParams) => [...expensesKeys.all, "list", params] as const,
  detail: (id: string) => [...expensesKeys.all, "detail", id] as const,
};

export async function getExpenses(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Expense>>("/expenses/", { params });
  return response.data;
}

export async function getExpense(id: string) {
  const response = await apiClient.get<Expense>(`/expenses/${id}/`);
  return response.data;
}

export async function createExpense(payload: Record<string, unknown> | FormData) {
  const response = await apiClient.post<Expense>("/expenses/", payload, {
    headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
}

export async function updateExpense(id: string, payload: Record<string, unknown> | FormData) {
  const response = await apiClient.patch<Expense>(`/expenses/${id}/`, payload, {
    headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
}

export async function deleteExpense(id: string) {
  await apiClient.delete(`/expenses/${id}/`);
}
