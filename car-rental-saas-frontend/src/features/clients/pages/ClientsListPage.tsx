import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/authStore";
import { clientsKeys, deleteClient, getClients } from "@/features/clients/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clientStatuses, pageSize } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";
import type { Client } from "@/types/common";

export default function ClientsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      ordering: "-created_at",
    }),
    [debouncedSearch, page, status],
  );

  const clientsQuery = useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => getClients(params),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: async () => {
      toast.success(t("ui.clientsDeleted", { defaultValue: "Client deleted successfully." }));
      setSelectedClient(null);
      await queryClient.invalidateQueries({ queryKey: clientsKeys.all });
    },
    onError: (error) => {
      toast.error(t("ui.deleteClientError", { defaultValue: "Unable to delete client" }), { description: getErrorMessage(error) });
    },
  });

  const allowDelete = user?.role === "SUPERADMIN" || user?.role === "AGENCY_OWNER";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.clients")}
        description={t("ui.clientsDescription")}
        actions={
          <Link to="/clients/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("common.add")} {t("common.client").toLowerCase()}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchClients")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {clientStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "full_name",
            header: t("common.client"),
            render: (client) => (
              <div>
                <p className="font-semibold text-slate-950">{client.full_name}</p>
                <p className="text-xs text-slate-500">{client.phone}</p>
              </div>
            ),
          },
          { key: "cin", header: "CIN", render: (client) => client.cin || "-" },
          { key: "driving_license", header: t("reservations.clientFields.drivingLicense"), render: (client) => client.driving_license || "-" },
          { key: "status", header: t("common.status"), render: (client) => <BadgeStatus status={client.status} /> },
          { key: "total_debt", header: t("common.totalDebt", { defaultValue: "Debt" }), render: (client) => <MoneyDisplay amount={client.total_debt} /> },
          { key: "total_contracts", header: t("common.contracts"), render: (client) => client.total_contracts },
          {
            key: "actions",
            header: t("common.actions"),
            render: (client) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/clients/${client.id}`}>
                  <Button size="sm" variant="outline">
                    {t("common.view")}
                  </Button>
                </Link>
                <Link to={`/clients/${client.id}/edit`}>
                  <Button size="sm" variant="outline">
                    {t("common.edit")}
                  </Button>
                </Link>
                {allowDelete ? (
                  <Button size="sm" variant="danger" onClick={() => setSelectedClient(client)}>
                    {t("common.delete")}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={clientsQuery.data?.results ?? []}
        loading={clientsQuery.isPending}
        error={clientsQuery.isError ? t("ui.noClients") : null}
        emptyTitle={t("ui.noClients")}
        emptyDescription={t("ui.noClientsDescription")}
        page={page}
        pageSize={pageSize}
        total={clientsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(selectedClient)}
        title={t("ui.deleteClient")}
        description={t("ui.deleteClientDescription")}
        confirmLabel={t("ui.deleteClient")}
        loading={deleteMutation.isPending}
        onClose={() => setSelectedClient(null)}
        onConfirm={() => {
          if (selectedClient) {
            deleteMutation.mutate(selectedClient.id);
          }
        }}
      >
        {selectedClient ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {selectedClient.full_name} · {selectedClient.phone}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
