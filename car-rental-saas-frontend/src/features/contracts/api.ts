import { apiClient, downloadBinaryFile } from "@/lib/apiClient";
import type { Contract, ContractFinancialSummary, PaginatedResponse, QueryListParams } from "@/types/common";

export const contractsKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractsKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...contractsKeys.lists(), params] as const,
  detail: (id: string) => [...contractsKeys.all, "detail", id] as const,
  summary: (id: string) => [...contractsKeys.detail(id), "summary"] as const,
};

export async function getContracts(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Contract>>("/contracts/", { params });
  return response.data;
}

export async function getContract(id: string) {
  const response = await apiClient.get<Contract>(`/contracts/${id}/`);
  return response.data;
}

export async function createContract(payload: Record<string, unknown>) {
  const response = await apiClient.post<Contract>("/contracts/", payload);
  return response.data;
}

export async function updateContract(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Contract>(`/contracts/${id}/`, payload);
  return response.data;
}

export async function activateContract(id: string) {
  const response = await apiClient.post<Contract>(`/contracts/${id}/activate/`);
  return response.data;
}

export async function completeContract(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Contract>(`/contracts/${id}/complete/`, payload);
  return response.data;
}

export async function cancelContract(id: string) {
  const response = await apiClient.post<Contract>(`/contracts/${id}/cancel/`);
  return response.data;
}

export async function getContractFinancialSummary(id: string) {
  const response = await apiClient.get<ContractFinancialSummary>(`/contracts/${id}/financial-summary/`);
  return response.data;
}

export async function downloadContractPdf(id: string) {
  await downloadBinaryFile(`/contracts/${id}/pdf/`, `contract-${id}.pdf`);
}
