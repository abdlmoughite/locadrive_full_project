import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getIncidents, incidentsKeys, resolveIncident } from "@/features/incidents/api";
import { useClientLookup, useContractLookup, useCarLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { incidentStatuses, incidentTypes, pageSize } from "@/lib/constants";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

export default function IncidentsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();
  const contractsQuery = useContractLookup();
  const carsQuery = useCarLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      type: type || undefined,
      ordering: "-created_at",
    }),
    [debouncedSearch, page, status, type],
  );

  const incidentsQuery = useQuery({
    queryKey: incidentsKeys.list(params),
    queryFn: () => getIncidents(params),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveIncident,
    onSuccess: async () => {
      toast.success(t("ui.incidentResolved", { defaultValue: "Incident resolved." }));
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
    onError: (error) => toast.error(t("ui.incidentResolveError", { defaultValue: "Unable to resolve incident" }), { description: getErrorMessage(error) }),
  });

  const clients = clientsQuery.data?.results ?? [];
  const contracts = contractsQuery.data?.results ?? [];
  const cars = carsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.incidents")}
        description={t("ui.incidentsDescription")}
        actions={
          <Link to="/incidents/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("ui.newIncident")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchIncidents")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {incidentStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">{t("common.allTypes")}</option>
          {incidentTypes.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "client",
            header: t("common.client"),
            render: (incident) => clients.find((client) => client.id === incident.client)?.full_name ?? "-",
          },
          {
            key: "car",
            header: t("common.car"),
            render: (incident) => cars.find((car) => car.id === incident.car)?.plate_number ?? "-",
          },
          {
            key: "contract",
            header: t("common.contract"),
            render: (incident) => contracts.find((contract) => contract.id === incident.contract)?.contract_number ?? "-",
          },
          { key: "type", header: t("common.type"), render: (incident) => formatEnumLabel(incident.type) },
          { key: "amount", header: t("common.amount"), render: (incident) => <MoneyDisplay amount={incident.amount} /> },
          { key: "status", header: t("common.status"), render: (incident) => <BadgeStatus status={incident.status} /> },
          { key: "created_at", header: t("common.created"), render: (incident) => formatDateTime(incident.created_at) },
          {
            key: "actions",
            header: t("common.actions"),
            render: (incident) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/incidents/${incident.id}`}>
                  <Button size="sm" variant="outline">
                    {t("common.view")}
                  </Button>
                </Link>
                {incident.status !== "RESOLVED" ? (
                  <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate(incident.id)}>
                    {t("common.resolve")}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={incidentsQuery.data?.results ?? []}
        loading={incidentsQuery.isPending}
        error={incidentsQuery.isError ? t("ui.noIncidents") : null}
        emptyTitle={t("ui.noIncidents")}
        emptyDescription={t("ui.noIncidentsDescription")}
        page={page}
        pageSize={pageSize}
        total={incidentsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
