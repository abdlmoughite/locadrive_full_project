import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getCar } from "@/features/cars/api";
import { getClient } from "@/features/clients/api";
import {
  cancelReservation,
  confirmReservation,
  convertReservationToContract,
  getReservation,
  reservationsKeys,
} from "@/features/reservations/api";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().min(0, "Value cannot be negative.").optional(),
);

const convertReservationSchema = z.object({
  daily_price: optionalNonNegativeNumber,
  start_mileage: optionalNonNegativeNumber,
  start_fuel_level: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(0, "Fuel level cannot be negative.").max(100, "Fuel level must be 100 or less.").optional(),
  ),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative."),
  extra_fees: z.coerce.number().min(0, "Extra fees cannot be negative."),
  blacklist_override_reason: z.string().optional(),
  activate_now: z.boolean().default(false),
});

type ConvertReservationFormValues = z.infer<typeof convertReservationSchema>;

export default function ReservationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [convertOpen, setConvertOpen] = useState(false);
  const convertForm = useForm<ConvertReservationFormValues>({
    resolver: zodResolver(convertReservationSchema) as never,
    defaultValues: {
      daily_price: undefined,
      start_mileage: undefined,
      start_fuel_level: undefined,
      discount_amount: 0,
      extra_fees: 0,
      blacklist_override_reason: "",
      activate_now: false,
    },
  });
  const activateNow = useWatch({
    control: convertForm.control,
    name: "activate_now",
  }) ?? false;

  const reservationQuery = useQuery({
    queryKey: reservationsKeys.detail(id),
    queryFn: () => getReservation(id),
    enabled: Boolean(id),
  });

  const clientQuery = useQuery({
    queryKey: ["reservation-client", reservationQuery.data?.client],
    queryFn: () => getClient(reservationQuery.data!.client),
    enabled: Boolean(reservationQuery.data?.client),
  });

  const carQuery = useQuery({
    queryKey: ["reservation-car", reservationQuery.data?.car],
    queryFn: () => getCar(reservationQuery.data!.car),
    enabled: Boolean(reservationQuery.data?.car),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: reservationsKeys.detail(id) });
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

  const convertMutation = useMutation({
    mutationFn: (values: ConvertReservationFormValues) => convertReservationToContract(id, values),
    onSuccess: async (contract) => {
      toast.success("Reservation converted to contract.");
      setConvertOpen(false);
      convertForm.reset();
      await refresh();
      navigate(`/contracts/${contract.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, convertForm.setError);
      toast.error("Unable to convert reservation", { description: getErrorMessage(error) });
    },
  });

  if (reservationQuery.isPending) {
    return <LoadingState title="Loading reservation..." />;
  }

  if (reservationQuery.isError || !reservationQuery.data) {
    return <ErrorState description="This reservation could not be loaded." />;
  }

  const reservation = reservationQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservation detail"
        description="Review the booking window, client, and vehicle before confirming or converting."
        actions={
          <>
            <Link to="/reservations">
              <Button variant="outline">Back to list</Button>
            </Link>
            {reservation.status === "PENDING" ? (
              <Button variant="success" onClick={() => confirmMutation.mutate(reservation.id)}>
                Confirm
              </Button>
            ) : null}
            {reservation.status !== "CANCELLED" && reservation.status !== "CONVERTED_TO_CONTRACT" ? (
              <Button variant="danger" onClick={() => cancelMutation.mutate(reservation.id)}>
                Cancel
              </Button>
            ) : null}
            {reservation.status !== "CANCELLED" && reservation.status !== "CONVERTED_TO_CONTRACT" ? (
              <Button onClick={() => setConvertOpen(true)}>Convert to contract</Button>
            ) : null}
          </>
        }
      />

      <DetailPanel
        title="Reservation profile"
        description="Reservation totals are estimated. Final billing is handled from the contract and invoice flow."
        items={[
          { label: "Status", value: <BadgeStatus status={reservation.status} /> },
          { label: "Client", value: clientQuery.data?.full_name ?? reservation.client },
          {
            label: "Car",
            value: carQuery.data ? `${carQuery.data.plate_number} · ${carQuery.data.brand} ${carQuery.data.model}` : reservation.car,
          },
          { label: "Start date", value: formatDate(reservation.start_date) },
          { label: "End date", value: formatDate(reservation.end_date) },
          { label: "Estimated total", value: <MoneyDisplay amount={reservation.estimated_total} /> },
          { label: "Advance amount", value: <MoneyDisplay amount={reservation.advance_amount} /> },
          { label: "Created at", value: formatDateTime(reservation.created_at) },
        ]}
      />

      <Modal
        open={convertOpen}
        onClose={() => {
          setConvertOpen(false);
          convertForm.reset();
        }}
        title="Convert reservation to contract"
        description="Optional fields let you tailor pricing and activation before the contract is created."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setConvertOpen(false);
                convertForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button form="convert-reservation-form" type="submit" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting..." : "Create contract"}
            </Button>
          </>
        }
      >
        <form id="convert-reservation-form" className="grid gap-4 md:grid-cols-2" onSubmit={convertForm.handleSubmit((values) => convertMutation.mutate(values))}>
          <FormField label="Daily price" error={convertForm.formState.errors.daily_price?.message}>
            <Input id="daily-price" type="number" min="0" step="0.01" {...convertForm.register("daily_price")} />
          </FormField>
          <FormField label="Start mileage" error={convertForm.formState.errors.start_mileage?.message}>
            <Input id="start-mileage" type="number" min="0" {...convertForm.register("start_mileage")} />
          </FormField>
          <FormField label="Start fuel level" error={convertForm.formState.errors.start_fuel_level?.message}>
            <Input id="start-fuel-level" type="number" min="0" max="100" step="0.01" {...convertForm.register("start_fuel_level")} />
          </FormField>
          <FormField label="Discount amount" error={convertForm.formState.errors.discount_amount?.message}>
            <Input id="discount-amount" type="number" min="0" step="0.01" {...convertForm.register("discount_amount")} />
          </FormField>
          <FormField label="Extra fees" error={convertForm.formState.errors.extra_fees?.message}>
            <Input id="extra-fees" type="number" min="0" step="0.01" {...convertForm.register("extra_fees")} />
          </FormField>
          <div className="flex items-center gap-3 pt-8">
            <input
              id="activate-now"
              type="checkbox"
              checked={activateNow}
              onChange={(event) => convertForm.setValue("activate_now", event.target.checked)}
            />
            <label className="text-sm font-medium text-slate-700" htmlFor="activate-now">
              Activate immediately
            </label>
          </div>
          <FormField label="Blacklist override reason" error={convertForm.formState.errors.blacklist_override_reason?.message} className="md:col-span-2">
            <Input
              id="override-reason"
              placeholder="Only needed if the client is blacklisted and the backend allows an owner override."
              {...convertForm.register("blacklist_override_reason")}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
