import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  cancelReservation,
  confirmReservation,
  getReservations,
  reservationsKeys,
} from "@/features/reservations/api";
import { useClientLookup, useCarLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { pageSize, reservationStatuses } from "@/lib/constants";
import { formatDate, formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

export default function ReservationsListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();
  const carsQuery = useCarLookup();

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

  const reservationsQuery = useQuery({
    queryKey: reservationsKeys.list(params),
    queryFn: () => getReservations(params),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
  };

  const confirmMutation = useMutation({
    mutationFn: confirmReservation,
    onSuccess: async () => {
      toast.success("Reservation confirmed.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to confirm reservation", { description: getErrorMessage(error) }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: async () => {
      toast.success("Reservation cancelled.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to cancel reservation", { description: getErrorMessage(error) }),
  });

  const clients = clientsQuery.data?.results ?? [];
  const cars = carsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Track upcoming bookings, confirm pickups, and convert qualified reservations into contracts."
        actions={
          <Link to="/reservations/create">
            <Button>
              <Plus className="h-4 w-4" />
              New reservation
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by client name or vehicle" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {reservationStatuses.map((option) => (
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
            header: "Client",
            render: (reservation) => clients.find((client) => client.id === reservation.client)?.full_name ?? reservation.client,
          },
          {
            key: "car",
            header: "Car",
            render: (reservation) => {
              const car = cars.find((item) => item.id === reservation.car);
              return car ? `${car.plate_number} · ${car.brand} ${car.model}` : reservation.car;
            },
          },
          { key: "start_date", header: "Start", render: (reservation) => formatDate(reservation.start_date) },
          { key: "end_date", header: "End", render: (reservation) => formatDate(reservation.end_date) },
          { key: "estimated_total", header: "Estimated total", render: (reservation) => <MoneyDisplay amount={reservation.estimated_total} /> },
          { key: "advance_amount", header: "Advance", render: (reservation) => <MoneyDisplay amount={reservation.advance_amount} /> },
          { key: "status", header: "Status", render: (reservation) => <BadgeStatus status={reservation.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (reservation) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/reservations/${reservation.id}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
                {reservation.status === "PENDING" ? (
                  <Button size="sm" variant="outline" onClick={() => confirmMutation.mutate(reservation.id)}>
                    Confirm
                  </Button>
                ) : null}
                {reservation.status !== "CANCELLED" && reservation.status !== "CONVERTED_TO_CONTRACT" ? (
                  <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(reservation.id)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={reservationsQuery.data?.results ?? []}
        loading={reservationsQuery.isPending}
        error={reservationsQuery.isError ? "Unable to load reservations." : null}
        emptyTitle="No reservations found"
        emptyDescription="Reservations will appear here as soon as your team starts booking vehicles."
        page={page}
        pageSize={pageSize}
        total={reservationsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
