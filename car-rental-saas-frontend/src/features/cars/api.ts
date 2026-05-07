import { apiClient } from "@/lib/apiClient";
import type { Car, CarChoicesResponse, CarDocument, CarHistoryEvent, PaginatedResponse, QueryListParams } from "@/types/common";

export const carsKeys = {
  all: ["cars"] as const,
  lists: () => [...carsKeys.all, "list"] as const,
  list: (params: QueryListParams) => [...carsKeys.lists(), params] as const,
  detail: (id: string) => [...carsKeys.all, "detail", id] as const,
  history: (id: string) => [...carsKeys.detail(id), "history"] as const,
  documents: (id: string) => [...carsKeys.detail(id), "documents"] as const,
  choices: () => [...carsKeys.all, "choices"] as const,
  available: (params: { start_date: string; end_date: string }) => [...carsKeys.all, "available", params] as const,
};

export async function getCars(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Car>>("/cars/", { params });
  return response.data;
}

export async function getCar(id: string) {
  const response = await apiClient.get<Car>(`/cars/${id}/`);
  return response.data;
}

export async function getCarChoices() {
  const response = await apiClient.get<CarChoicesResponse>("/cars/choices/");
  return response.data;
}

export async function createCar(payload: Record<string, unknown>) {
  const response = await apiClient.post<Car>("/cars/", payload);
  return response.data;
}

export async function updateCar(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Car>(`/cars/${id}/`, payload);
  return response.data;
}

export async function deleteCar(id: string) {
  await apiClient.delete(`/cars/${id}/`);
}

export async function deactivateCar(id: string) {
  const response = await apiClient.post<Car>(`/cars/${id}/deactivate/`);
  return response.data;
}

export async function reactivateCar(id: string) {
  const response = await apiClient.post<Car>(`/cars/${id}/reactivate/`);
  return response.data;
}

export async function getAvailableCars(start_date: string, end_date: string) {
  const response = await apiClient.get<PaginatedResponse<Car> | Car[]>("/cars/available/", {
    params: { start_date, end_date },
  });
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function setCarMaintenance(id: string) {
  const response = await apiClient.post<Car>(`/cars/${id}/set-maintenance/`);
  return response.data;
}

export async function setCarAvailable(id: string) {
  const response = await apiClient.post<Car>(`/cars/${id}/set-available/`);
  return response.data;
}

export async function getCarHistory(id: string) {
  const response = await apiClient.get<PaginatedResponse<CarHistoryEvent> | CarHistoryEvent[]>(`/cars/${id}/history/`);
  return Array.isArray(response.data) ? response.data : response.data.results;
}

export async function getCarDocuments(id: string) {
  const response = await apiClient.get<PaginatedResponse<CarDocument>>("/car-documents/", {
    params: { car: id, page_size: 100 },
  });
  return response.data.results;
}
