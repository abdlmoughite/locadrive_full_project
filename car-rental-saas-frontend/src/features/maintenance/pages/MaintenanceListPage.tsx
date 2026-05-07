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
import {
  cancelMaintenanceRecord,
  completeMaintenanceRecord,
  getMaintenanceRecords,
  maintenanceKeys,
} from "@/features/maintenance/api";
import { useCarLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { maintenanceStatuses, pageSize } from "@/lib/constants";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

export default function MaintenanceListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const carsQuery = useCarLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      ordering: "-started_at",
    }),
    [debouncedSearch, page, status],
  );

  const recordsQuery = useQuery({
    queryKey: maintenanceKeys.list(params),
    queryFn: () => getMaintenanceRecords(params),
  });

  const completeMutation = useMutation({
    mutationFn: completeMaintenanceRecord,
    onSuccess: async () => {
      toast.success(t("maintenance.completeSuccess"));
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
    onError: (error) => toast.error(t("common.complete"), { description: getErrorMessage(error) }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelMaintenanceRecord,
    onSuccess: async () => {
      toast.success(t("maintenance.cancelSuccess"));
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
    onError: (error) => toast.error(t("common.cancel"), { description: getErrorMessage(error) }),
  });

  const cars = carsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.title")}
        description={t("maintenance.description")}
        actions={
          <Link to="/maintenance/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("maintenance.new")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by type, description, or car" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("cars.allStatuses")}</option>
          {maintenanceStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "car",
            header: t("common.car"),
            render: (record) => {
              const car = cars.find((item) => item.id === record.car);
              return car ? `${car.plate_number} · ${car.brand} ${car.model}` : record.car;
            },
          },
          { key: "type", header: t("maintenance.fields.type"), render: (record) => record.type },
          { key: "cost", header: t("maintenance.fields.cost"), render: (record) => <MoneyDisplay amount={record.cost} /> },
          { key: "started_at", header: t("maintenance.fields.startedAt"), render: (record) => formatDateTime(record.started_at) },
          {
            key: "estimated_end_at",
            header: t("maintenance.fields.estimatedEnd"),
            render: (record) => record.estimated_end_at ? formatDateTime(record.estimated_end_at) : `${record.estimated_duration_hours} h`,
          },
          { key: "status", header: t("common.status"), render: (record) => <BadgeStatus status={record.status} /> },
          {
            key: "actions",
            header: t("common.actions"),
            render: (record) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/maintenance/${record.id}`}>
                  <Button size="sm" variant="outline">
                    {t("common.view")}
                  </Button>
                </Link>
                {record.status !== "COMPLETED" && record.status !== "CANCELLED" ? (
                  <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(record.id)}>
                    {t("common.complete")}
                  </Button>
                ) : null}
                {record.status !== "COMPLETED" && record.status !== "CANCELLED" ? (
                  <Button size="sm" variant="danger" onClick={() => cancelMutation.mutate(record.id)}>
                    {t("common.cancel")}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={recordsQuery.data?.results ?? []}
        loading={recordsQuery.isPending}
        error={recordsQuery.isError ? "Unable to load maintenance records." : null}
        emptyTitle="No maintenance records found"
        emptyDescription="Scheduled maintenance and repair jobs will appear here."
        page={page}
        pageSize={pageSize}
        total={recordsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
