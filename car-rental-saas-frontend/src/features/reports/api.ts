import { apiClient } from "@/lib/apiClient";
import type { CarProfitabilityRow, ClientBalanceRow, FinanceSummaryReport } from "@/types/common";

export const reportsKeys = {
  all: ["reports"] as const,
  finance: (params: Record<string, string | undefined>) => [...reportsKeys.all, "finance", params] as const,
  profitability: (params: Record<string, string | undefined>) => [...reportsKeys.all, "profitability", params] as const,
  clientBalances: () => [...reportsKeys.all, "client-balances"] as const,
};

export async function getFinanceSummary(params: Record<string, string | undefined>) {
  const response = await apiClient.get<FinanceSummaryReport>("/reports/finance-summary/", { params });
  return response.data;
}

export async function getCarProfitability(params: Record<string, string | undefined>) {
  const response = await apiClient.get<CarProfitabilityRow[]>("/reports/car-profitability/", { params });
  return response.data;
}

export async function getClientBalances() {
  const response = await apiClient.get<ClientBalanceRow[]>("/reports/client-balances/");
  return response.data;
}

