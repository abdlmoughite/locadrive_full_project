import { apiClient } from "@/lib/apiClient";
import { omitEmptyStrings } from "@/lib/utils";
import type { Contract, PaginatedResponse, QueryListParams, Reservation } from "@/types/common";

export const reservationsKeys = {
  all: ["reservations"] as const,
  lists: () => [...reservationsKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...reservationsKeys.lists(), params] as const,
  detail: (id: string) => [...reservationsKeys.all, "detail", id] as const,
};

export async function getReservations(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Reservation>>("/reservations/", { params });
  return response.data;
}

export async function getReservation(id: string) {
  const response = await apiClient.get<Reservation>(`/reservations/${id}/`);
  return response.data;
}

export async function createReservation(payload: Record<string, unknown>) {
  const response = await apiClient.post<Reservation>("/reservations/", omitEmptyStrings(payload));
  return response.data;
}

export async function updateReservation(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Reservation>(`/reservations/${id}/`, payload);
  return response.data;
}

export async function confirmReservation(id: string) {
  const response = await apiClient.post<Reservation>(`/reservations/${id}/confirm/`);
  return response.data;
}

export async function cancelReservation(id: string) {
  const response = await apiClient.post<Reservation>(`/reservations/${id}/cancel/`);
  return response.data;
}

export async function convertReservationToContract(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Contract>(`/reservations/${id}/convert-to-contract/`, payload);
  return response.data;
}
