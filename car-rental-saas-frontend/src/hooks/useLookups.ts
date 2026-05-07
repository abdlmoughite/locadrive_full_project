import { useQuery } from "@tanstack/react-query";

import { getCars, carsKeys } from "@/features/cars/api";
import { getClients, clientsKeys } from "@/features/clients/api";
import { getContracts, contractsKeys } from "@/features/contracts/api";
import { getInvoices, financeKeys } from "@/features/invoices/api";
import { getUsers, usersKeys } from "@/features/users/api";

export function useClientLookup() {
  return useQuery({
    queryKey: clientsKeys.list({ page_size: 250 }),
    queryFn: () => getClients({ page_size: 250 }),
    staleTime: 60_000,
  });
}

export function useCarLookup(options?: { activeOnly?: boolean }) {
  const params = {
    page_size: 250,
    ...(options?.activeOnly ? { is_active: true } : {}),
  };

  return useQuery({
    queryKey: carsKeys.list(params),
    queryFn: () => getCars(params),
    staleTime: 60_000,
  });
}

export function useContractLookup() {
  return useQuery({
    queryKey: contractsKeys.list({ page_size: 250 }),
    queryFn: () => getContracts({ page_size: 250 }),
    staleTime: 60_000,
  });
}

export function useInvoiceLookup() {
  return useQuery({
    queryKey: financeKeys.invoiceList({ page_size: 250 }),
    queryFn: () => getInvoices({ page_size: 250 }),
    staleTime: 60_000,
  });
}

export function useUserLookup() {
  return useQuery({
    queryKey: usersKeys.list({ page_size: 250 }),
    queryFn: () => getUsers({ page_size: 250 }),
    staleTime: 60_000,
  });
}
