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
import {
  carsKeys,
  deactivateCar,
  getCars,
  reactivateCar,
  setCarAvailable,
  setCarMaintenance,
} from "@/features/cars/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { pageSize, carStatuses } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";
import type { Car } from "@/types/common";

export default function CarsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activity, setActivity] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      is_active: activity === "" ? undefined : activity === "active",
      ordering: "-created_at",
    }),
    [activity, debouncedSearch, page, status],
  );

  const carsQuery = useQuery({
    queryKey: carsKeys.list(params),
    queryFn: () => getCars(params),
  });

  const refreshCars = async () => {
    await queryClient.invalidateQueries({ queryKey: carsKeys.all });
  };

  const maintenanceMutation = useMutation({
    mutationFn: setCarMaintenance,
    onSuccess: async () => {
      toast.success(t("cars.maintenanceSuccess"));
      await refreshCars();
    },
    onError: (error) => {
      toast.error(t("cars.setMaintenance"), { description: getErrorMessage(error) });
    },
  });

  const availableMutation = useMutation({
    mutationFn: setCarAvailable,
    onSuccess: async () => {
      toast.success(t("cars.availableSuccess"));
      await refreshCars();
    },
    onError: (error) => {
      toast.error(t("cars.setAvailable"), { description: getErrorMessage(error) });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCar,
    onSuccess: async () => {
      toast.success(t("cars.deactivateSuccess"));
      setSelectedCar(null);
      await refreshCars();
    },
    onError: (error) => {
      toast.error(t("cars.deactivate"), { description: getErrorMessage(error) });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateCar,
    onSuccess: async () => {
      toast.success(t("cars.reactivateSuccess"));
      await refreshCars();
    },
    onError: (error) => {
      toast.error(t("cars.reactivate"), { description: getErrorMessage(error) });
    },
  });

  const rows = carsQuery.data?.results ?? [];
  const allowCarManagement = user?.role === "AGENCY_OWNER";
  const allowDeactivate = user?.role === "AGENCY_OWNER";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cars.title")}
        description={t("cars.description")}
        actions={
          allowCarManagement ? (
            <Link to="/cars/create">
              <Button>
                <Plus className="h-4 w-4" />
                {t("cars.addCar")}
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("cars.searchPlaceholder")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("cars.allStatuses")}</option>
          {carStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={activity} onChange={(event) => setActivity(event.target.value)}>
          <option value="">{t("cars.allActivity")}</option>
          <option value="active">{t("cars.activeOnly")}</option>
          <option value="inactive">{t("cars.inactiveOnly")}</option>
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "plate_number",
            header: t("common.car"),
            render: (car) => (
              <div>
                <p className="font-semibold text-slate-950">{car.plate_number}</p>
                <p className="text-xs text-slate-500">
                  {car.brand} {car.model}
                </p>
              </div>
            ),
          },
          { key: "year", header: t("cars.fields.year"), render: (car) => car.year },
          {
            key: "daily_price",
            header: t("cars.fields.dailyPrice"),
            render: (car) => <MoneyDisplay amount={car.daily_price} />,
          },
          {
            key: "deposit_amount",
            header: t("cars.fields.depositAmount"),
            render: (car) => <MoneyDisplay amount={car.deposit_amount} />,
          },
          { key: "mileage", header: t("cars.fields.mileage"), render: (car) => `${car.mileage} km` },
          {
            key: "status",
            header: t("common.status"),
            render: (car) => (
              <div className="flex flex-wrap gap-2">
                <BadgeStatus status={car.status} />
                {!car.is_active ? <BadgeStatus status="INACTIVE" /> : null}
              </div>
            ),
          },
          {
            key: "actions",
            header: t("common.actions"),
            render: (car) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/cars/${car.id}`}>
                  <Button size="sm" variant="outline">
                    {t("common.view")}
                  </Button>
                </Link>
                {allowCarManagement ? (
                  <Link to={`/cars/${car.id}/edit`}>
                    <Button size="sm" variant="outline">
                      {t("common.edit")}
                    </Button>
                  </Link>
                ) : null}
                {allowCarManagement && car.is_active ? (
                  <Button size="sm" variant="outline" onClick={() => maintenanceMutation.mutate(car.id)}>
                    {t("cars.setMaintenance")}
                  </Button>
                ) : null}
                {allowCarManagement && car.is_active ? (
                  <Button size="sm" variant="outline" onClick={() => availableMutation.mutate(car.id)}>
                    {t("cars.setAvailable")}
                  </Button>
                ) : null}
                {allowDeactivate && car.is_active ? (
                  <Button size="sm" variant="danger" onClick={() => setSelectedCar(car)}>
                    {t("cars.deactivate")}
                  </Button>
                ) : null}
                {allowDeactivate && !car.is_active ? (
                  <Button size="sm" variant="success" onClick={() => reactivateMutation.mutate(car.id)}>
                    {t("cars.reactivate")}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={rows}
        loading={carsQuery.isPending}
        error={carsQuery.isError ? "We could not load the fleet list." : null}
        emptyTitle="No cars found"
        emptyDescription={
          allowCarManagement
            ? "Create your first fleet vehicle to start taking reservations and contracts."
            : "No fleet vehicles match the current filters."
        }
        page={page}
        pageSize={pageSize}
        total={carsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(selectedCar)}
        title={t("cars.deactivate")}
        description="This keeps the car in the database but removes it from reservations, maintenance scheduling, and operational selects."
        confirmLabel={t("cars.deactivate")}
        loading={deactivateMutation.isPending}
        onClose={() => setSelectedCar(null)}
        onConfirm={() => {
          if (selectedCar) {
            deactivateMutation.mutate(selectedCar.id);
          }
        }}
      >
        {selectedCar ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {selectedCar.brand} {selectedCar.model} ({selectedCar.plate_number})
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
