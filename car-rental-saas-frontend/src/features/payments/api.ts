import { apiClient } from "@/lib/apiClient";
import { omitEmptyStrings } from "@/lib/utils";
import type { PaginatedResponse, Payment, QueryListParams } from "@/types/common";

export const paymentsKeys = {
  all: ["payments"] as const,
  list: (params: QueryListParams) => [...paymentsKeys.all, "list", params] as const,
  detail: (id: string) => [...paymentsKeys.all, "detail", id] as const,
};

export async function getPayments(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Payment>>("/payments/", { params });
  return response.data;
}

export async function getPayment(id: string) {
  const response = await apiClient.get<Payment>(`/payments/${id}/`);
  return response.data;
}

export async function createPayment(payload: Record<string, unknown>) {
  const response = await apiClient.post<Payment>("/payments/", omitEmptyStrings(payload));
  return response.data;
}
