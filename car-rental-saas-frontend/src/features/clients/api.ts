import { apiClient } from "@/lib/apiClient";
import type {
  Client,
  ClientHistoryEvent,
  ClientNote,
  Contract,
  Deposit,
  DuplicateCheckResponse,
  Incident,
  Invoice,
  PaginatedResponse,
  Payment,
  QueryListParams,
} from "@/types/common";

export const clientsKeys = {
  all: ["clients"] as const,
  lists: () => [...clientsKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...clientsKeys.lists(), params] as const,
  detail: (id: string) => [...clientsKeys.all, "detail", id] as const,
  history: (id: string) => [...clientsKeys.detail(id), "history"] as const,
  check: (params: QueryListParams) => [...clientsKeys.all, "check", params] as const,
};

export async function getClients(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Client>>("/clients/", { params });
  return response.data;
}

export async function getClient(id: string) {
  const response = await apiClient.get<Client>(`/clients/${id}/`);
  return response.data;
}

export async function createClient(payload: Record<string, unknown>) {
  const response = await apiClient.post<Client>("/clients/", payload);
  return response.data;
}

export async function updateClient(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Client>(`/clients/${id}/`, payload);
  return response.data;
}

export async function deleteClient(id: string) {
  await apiClient.delete(`/clients/${id}/`);
}

export async function checkDuplicateClient(params: QueryListParams) {
  const response = await apiClient.get<DuplicateCheckResponse>("/clients/check/", { params });
  return response.data;
}

export async function getClientHistory(id: string) {
  const response = await apiClient.get<PaginatedResponse<ClientHistoryEvent> | ClientHistoryEvent[]>(`/clients/${id}/history/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getClientContracts(id: string) {
  const response = await apiClient.get<PaginatedResponse<Contract> | Contract[]>(`/clients/${id}/contracts/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getClientPayments(id: string) {
  const response = await apiClient.get<PaginatedResponse<Payment> | Payment[]>(`/clients/${id}/payments/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getClientInvoices(id: string) {
  const response = await apiClient.get<PaginatedResponse<Invoice> | Invoice[]>(`/clients/${id}/invoices/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getClientDeposits(id: string) {
  const response = await apiClient.get<PaginatedResponse<Deposit> | Deposit[]>(`/clients/${id}/deposits/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getClientIncidents(id: string) {
  const response = await apiClient.get<PaginatedResponse<Incident> | Incident[]>(`/clients/${id}/incidents/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function addClientNote(id: string, note: string) {
  const response = await apiClient.post<ClientNote>(`/clients/${id}/notes/`, { note });
  return response.data;
}

export async function addClientWarning(id: string, payload: { reason?: string; note?: string }) {
  const response = await apiClient.post<Client>(`/clients/${id}/warning/`, payload);
  return response.data;
}

export async function blacklistClient(id: string, payload: { reason?: string; note?: string }) {
  const response = await apiClient.post<Client>(`/clients/${id}/blacklist/`, payload);
  return response.data;
}

export async function unblacklistClient(id: string, payload: { reason?: string; note?: string }) {
  const response = await apiClient.post<Client>(`/clients/${id}/unblacklist/`, payload);
  return response.data;
}
