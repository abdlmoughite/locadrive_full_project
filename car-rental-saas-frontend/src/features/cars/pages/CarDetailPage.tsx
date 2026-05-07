import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  carsKeys,
  deactivateCar,
  getCar,
  getCarDocuments,
  getCarHistory,
  reactivateCar,
  setCarAvailable,
  setCarMaintenance,
} from "@/features/cars/api";
import { useAuthStore } from "@/features/auth/authStore";
import { getContracts } from "@/features/contracts/api";
import { getExpenses } from "@/features/expenses/api";
import { getIncidents } from "@/features/incidents/api";
import { getMaintenanceRecords } from "@/features/maintenance/api";
import { getErrorMessage } from "@/lib/apiClient";
import { formatDate, formatDateTime, formatEnumLabel } from "@/lib/formatters";

export default function CarDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const carQuery = useQuery({
    queryKey: carsKeys.detail(id),
    queryFn: () => getCar(id),
    enabled: Boolean(id),
  });

  const historyQuery = useQuery({
    queryKey: carsKeys.history(id),
    queryFn: () => getCarHistory(id),
    enabled: Boolean(id),
  });

  const documentsQuery = useQuery({
    queryKey: carsKeys.documents(id),
    queryFn: () => getCarDocuments(id),
    enabled: Boolean(id),
  });

  const [contractsQuery, maintenanceQuery, expensesQuery, incidentsQuery] = useQueries({
    queries: [
      {
        queryKey: ["car-contracts", id],
        queryFn: () => getContracts({ car: id, page_size: 5, ordering: "-created_at" }),
        enabled: Boolean(id),
      },
      {
        queryKey: ["car-maintenance", id],
        queryFn: () => getMaintenanceRecords({ car: id, page_size: 5, ordering: "-started_at" }),
        enabled: Boolean(id),
      },
      {
        queryKey: ["car-expenses", id],
        queryFn: () => getExpenses({ car: id, page_size: 5, ordering: "-expense_date" }),
        enabled: Boolean(id),
      },
      {
        queryKey: ["car-incidents", id],
        queryFn: () => getIncidents({ car: id, page_size: 5, ordering: "-created_at" }),
        enabled: Boolean(id),
      },
    ],
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: carsKeys.all });
    await queryClient.invalidateQueries({ queryKey: carsKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: carsKeys.history(id) });
  };

  const maintenanceMutation = useMutation({
    mutationFn: setCarMaintenance,
    onSuccess: async () => {
      toast.success(t("cars.maintenanceSuccess"));
      await refresh();
    },
    onError: (error) => {
      toast.error(t("cars.setMaintenance"), { description: getErrorMessage(error) });
    },
  });

  const availableMutation = useMutation({
    mutationFn: setCarAvailable,
    onSuccess: async () => {
      toast.success(t("cars.availableSuccess"));
      await refresh();
    },
    onError: (error) => {
      toast.error(t("cars.setAvailable"), { description: getErrorMessage(error) });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCar,
    onSuccess: async () => {
      toast.success(t("cars.deactivateSuccess"));
      await refresh();
    },
    onError: (error) => {
      toast.error(t("cars.deactivate"), { description: getErrorMessage(error) });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateCar,
    onSuccess: async () => {
      toast.success(t("cars.reactivateSuccess"));
      await refresh();
    },
    onError: (error) => {
      toast.error(t("cars.reactivate"), { description: getErrorMessage(error) });
    },
  });

  if (carQuery.isPending) {
    return <LoadingState title="Loading car details..." />;
  }

  if (carQuery.isError || !carQuery.data) {
    return <ErrorState description="This car could not be loaded." />;
  }

  const car = carQuery.data;
  const allowCarManagement = user?.role === "AGENCY_OWNER";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${car.brand} ${car.model}`}
        description={`Plate ${car.plate_number} · ${car.year}`}
        actions={
          <>
            {allowCarManagement && car.is_active ? (
              <Button variant="outline" onClick={() => maintenanceMutation.mutate(car.id)}>
                {t("cars.setMaintenance")}
              </Button>
            ) : null}
            {allowCarManagement && car.is_active ? (
              <Button variant="outline" onClick={() => availableMutation.mutate(car.id)}>
                {t("cars.setAvailable")}
              </Button>
            ) : null}
            {allowCarManagement && car.is_active ? (
              <Button variant="danger" onClick={() => deactivateMutation.mutate(car.id)}>
                {t("cars.deactivate")}
              </Button>
            ) : null}
            {allowCarManagement && !car.is_active ? (
              <Button variant="success" onClick={() => reactivateMutation.mutate(car.id)}>
                {t("cars.reactivate")}
              </Button>
            ) : null}
            {allowCarManagement ? (
              <Link to={`/cars/${car.id}/edit`}>
                <Button>{t("common.edit")}</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <DetailPanel
        title={t("cars.vehicleDetails")}
        description={t("cars.detailDescription")}
        items={[
          {
            label: t("common.status"),
            value: (
              <div className="flex flex-wrap gap-2">
                <BadgeStatus status={car.status} />
                {!car.is_active ? <BadgeStatus status="INACTIVE" /> : null}
              </div>
            ),
          },
          { label: t("cars.fields.fuelType"), value: formatEnumLabel(car.fuel_type) },
          { label: t("cars.fields.transmission"), value: formatEnumLabel(car.transmission) },
          { label: t("cars.fields.color"), value: car.color || "-" },
          { label: t("cars.fields.mileage"), value: `${car.mileage} km` },
          { label: t("cars.fields.dailyPrice"), value: <MoneyDisplay amount={car.daily_price} /> },
          { label: t("cars.fields.depositAmount"), value: <MoneyDisplay amount={car.deposit_amount} /> },
          { label: "Created", value: formatDateTime(car.created_at) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentsQuery.data?.length ? (
              documentsQuery.data.map((document) => (
                <div key={document.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-950">{formatEnumLabel(document.type)}</p>
                  <p className="mt-1 text-sm text-slate-500">Expiry: {formatDate(document.expiry_date)}</p>
                  <a className="mt-3 inline-block text-sm font-semibold text-blue-600" href={document.file} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No car documents uploaded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.data?.length ? (
              historyQuery.data.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{event.title}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No history events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "contract_number", header: "Contract", render: (contract) => contract.contract_number },
              { key: "start_date", header: "Start", render: (contract) => formatDate(contract.start_date) },
              { key: "expected_return_date", header: "Expected return", render: (contract) => formatDate(contract.expected_return_date) },
              { key: "status", header: "Status", render: (contract) => <BadgeStatus status={contract.status} /> },
              { key: "total_amount", header: "Total", render: (contract) => <MoneyDisplay amount={contract.total_amount} /> },
            ]}
            rows={contractsQuery.data?.results ?? []}
            loading={contractsQuery.isPending}
            error={contractsQuery.isError ? "Unable to load contracts." : null}
            emptyTitle="No contracts yet"
            emptyDescription="Contracts involving this car will appear here."
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "type", header: "Type", render: (record) => record.type },
                { key: "date", header: "Date", render: (record) => formatDate(record.started_at) },
                { key: "cost", header: "Cost", render: (record) => <MoneyDisplay amount={record.cost} /> },
                { key: "status", header: "Status", render: (record) => <BadgeStatus status={record.status} /> },
              ]}
              rows={maintenanceQuery.data?.results ?? []}
              loading={maintenanceQuery.isPending}
              error={maintenanceQuery.isError ? "Unable to load maintenance records." : null}
              emptyTitle="No maintenance records"
              emptyDescription="Maintenance work for this car will appear here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "type", header: "Type", render: (incident) => formatEnumLabel(incident.type) },
                { key: "created_at", header: "Created", render: (incident) => formatDateTime(incident.created_at) },
                { key: "amount", header: "Amount", render: (incident) => <MoneyDisplay amount={incident.amount} /> },
                { key: "status", header: "Status", render: (incident) => <BadgeStatus status={incident.status} /> },
              ]}
              rows={incidentsQuery.data?.results ?? []}
              loading={incidentsQuery.isPending}
              error={incidentsQuery.isError ? "Unable to load incidents." : null}
              emptyTitle="No incidents"
              emptyDescription="Damage, fines, and late returns tied to this vehicle appear here."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Related expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: "title", header: "Expense", render: (expense) => expense.title },
              { key: "category", header: "Category", render: (expense) => formatEnumLabel(expense.category) },
              { key: "date", header: "Date", render: (expense) => formatDate(expense.expense_date) },
              { key: "amount", header: "Amount", render: (expense) => <MoneyDisplay amount={expense.amount} /> },
            ]}
            rows={expensesQuery.data?.results ?? []}
            loading={expensesQuery.isPending}
            error={expensesQuery.isError ? "Unable to load expenses." : null}
            emptyTitle="No expenses"
            emptyDescription="Vehicle-linked expenses will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
