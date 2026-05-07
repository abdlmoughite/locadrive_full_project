import { apiClient } from "@/lib/apiClient";
import type { Deposit, PaginatedResponse, QueryListParams } from "@/types/common";

export const depositsKeys = {
  all: ["deposits"] as const,
  list: (params: QueryListParams) => [...depositsKeys.all, "list", params] as const,
  detail: (id: string) => [...depositsKeys.all, "detail", id] as const,
};

export async function getDeposits(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Deposit>>("/deposits/", { params });
  return response.data;
}

export async function getDeposit(id: string) {
  const response = await apiClient.get<Deposit>(`/deposits/${id}/`);
  return response.data;
}

export async function createContractDeposit(contractId: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Deposit>(`/contracts/${contractId}/deposit/`, payload);
  return response.data;
}

export async function refundDeposit(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Deposit>(`/deposits/${id}/refund/`, payload);
  return response.data;
}

export async function useDeposit(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Deposit>(`/deposits/${id}/use/`, payload);
  return response.data;
}

