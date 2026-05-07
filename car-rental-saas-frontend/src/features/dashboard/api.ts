import { apiClient } from "@/lib/apiClient";
import type { Agency, DashboardSummary, PaginatedResponse, Subscription, User } from "@/types/common";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  agencies: () => [...dashboardKeys.all, "agencies"] as const,
  users: () => [...dashboardKeys.all, "users"] as const,
  subscriptions: () => [...dashboardKeys.all, "subscriptions"] as const,
};

export async function getAgencyDashboardSummary() {
  const response = await apiClient.get<DashboardSummary>("/reports/dashboard/");
  return response.data;
}

export async function getAgenciesSnapshot() {
  const response = await apiClient.get<PaginatedResponse<Agency>>("/agencies/", {
    params: { page_size: 100 },
  });
  return response.data.results;
}

export async function getUsersSnapshot() {
  const response = await apiClient.get<PaginatedResponse<User>>("/users/", {
    params: { page_size: 100 },
  });
  return response.data.results;
}

export async function getSubscriptionsSnapshot() {
  const response = await apiClient.get<PaginatedResponse<Subscription>>("/subscriptions/", {
    params: { page_size: 100 },
  });
  return response.data.results;
}

