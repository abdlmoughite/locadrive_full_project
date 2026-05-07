import { apiClient, downloadBinaryFile } from "@/lib/apiClient";
import { omitEmptyStrings } from "@/lib/utils";
import type { Invoice, PaginatedResponse, Payment, QueryListParams } from "@/types/common";

export const financeKeys = {
  invoices: ["invoices"] as const,
  invoiceList: (params: QueryListParams) => [...financeKeys.invoices, "list", params] as const,
  invoiceDetail: (id: string) => [...financeKeys.invoices, "detail", id] as const,
  payments: ["payments"] as const,
  paymentList: (params: QueryListParams) => [...financeKeys.payments, "list", params] as const,
  deposits: ["deposits"] as const,
  depositList: (params: QueryListParams) => [...financeKeys.deposits, "list", params] as const,
  expenses: ["expenses"] as const,
  expenseList: (params: QueryListParams) => [...financeKeys.expenses, "list", params] as const,
};

export async function getInvoices(params: QueryListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<Invoice>>("/invoices/", { params });
  return response.data;
}

export async function getInvoice(id: string) {
  const response = await apiClient.get<Invoice>(`/invoices/${id}/`);
  return response.data;
}

export async function createInvoice(payload: Record<string, unknown>) {
  const response = await apiClient.post<Invoice>("/invoices/", omitEmptyStrings(payload));
  return response.data;
}

export async function updateInvoice(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.patch<Invoice>(`/invoices/${id}/`, omitEmptyStrings(payload));
  return response.data;
}

export async function issueInvoice(id: string) {
  const response = await apiClient.post<Invoice>(`/invoices/${id}/issue/`);
  return response.data;
}

export async function payInvoice(id: string, payload: Record<string, unknown>) {
  const response = await apiClient.post<Invoice>(`/invoices/${id}/pay/`, payload);
  return response.data;
}

export async function cancelInvoice(id: string) {
  const response = await apiClient.post<Invoice>(`/invoices/${id}/cancel/`);
  return response.data;
}

export async function downloadInvoicePdf(id: string) {
  await downloadBinaryFile(`/invoices/${id}/pdf/`, `invoice-${id}.pdf`);
}

export async function getInvoicePayments(id: string) {
  const response = await apiClient.get<PaginatedResponse<Payment>>("/payments/", {
    params: { invoice: id, page_size: 100 },
  });
  return response.data.results;
}
