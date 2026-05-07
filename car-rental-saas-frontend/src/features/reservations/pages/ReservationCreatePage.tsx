import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { reservationSchema } from "@/components/forms/schemas";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { carsKeys, getAvailableCars } from "@/features/cars/api";
import { createReservation, reservationsKeys } from "@/features/reservations/api";
import { useClientLookup } from "@/hooks/useLookups";
import { getErrorMessage } from "@/lib/apiClient";

type ReservationFormValues = z.infer<typeof reservationSchema>;

export default function ReservationCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema) as never,
    defaultValues: {
      client_mode: "existing",
      client: "",
      new_client: {
        full_name: "",
        phone: "",
        email: "",
        cin: "",
        passport: "",
        driving_license: "",
        address: "",
        birth_date: "",
      },
      car: "",
      start_date: "",
      end_date: "",
      advance_amount: 0,
    },
  });

  const [startDate, endDate, clientMode, selectedClientId, selectedCarId] = useWatch({
    control: form.control,
    name: ["start_date", "end_date", "client_mode", "client", "car"],
  });

  const availableCarsQuery = useQuery({
    queryKey: carsKeys.available({ start_date: startDate, end_date: endDate }),
    queryFn: () => getAvailableCars(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });

  const mutation = useMutation({
    mutationFn: (values: ReservationFormValues) => {
      const payload =
        values.client_mode === "existing"
          ? {
              client: values.client,
              car: values.car,
              start_date: values.start_date,
              end_date: values.end_date,
              advance_amount: values.advance_amount,
            }
          : {
              new_client: values.new_client,
              car: values.car,
              start_date: values.start_date,
              end_date: values.end_date,
              advance_amount: values.advance_amount,
            };
      return createReservation(payload);
    },
    onSuccess: async (reservation) => {
      toast.success(t("reservations.createSuccess"));
      await queryClient.invalidateQueries({ queryKey: reservationsKeys.all });
      navigate(`/reservations/${reservation.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create reservation", { description: getErrorMessage(error) });
    },
  });

  const clientOptions = useMemo(
    () =>
      (clientsQuery.data?.results ?? []).map((client) => ({
        value: client.id,
        label: `${client.full_name} · ${client.phone}`,
        description: `${client.email || "-"} · ${formatClientMeta(client)}`,
      })),
    [clientsQuery.data],
  );

  const carOptions = useMemo(
    () =>
      (availableCarsQuery.data ?? []).map((car) => ({
        value: car.id,
        label: `${car.plate_number} · ${car.brand} ${car.model}`,
        description: `${car.daily_price} · ${car.status}`,
      })),
    [availableCarsQuery.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reservations.createTitle")}
        description={t("reservations.createDescription")}
        actions={
          <Link to="/reservations">
            <Button variant="outline">{t("common.cancel")}</Button>
          </Link>
        }
      />

      <FormSection title={t("reservations.reservationDetails")} description={t("reservations.reservationDetailsDescription")}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button
              type="button"
              variant={clientMode === "existing" ? "primary" : "outline"}
              onClick={() => form.setValue("client_mode", "existing")}
            >
              {t("reservations.existingClient")}
            </Button>
            <Button
              type="button"
              variant={clientMode === "new" ? "primary" : "outline"}
              onClick={() => form.setValue("client_mode", "new")}
            >
              {t("reservations.newClient")}
            </Button>
          </div>

          {clientMode === "existing" ? (
            <FormField label={t("common.client")} error={form.formState.errors.client?.message} className="md:col-span-2">
              <SearchableSelect
                inputId="reservation-client"
                value={clientOptions.find((option) => option.value === selectedClientId) ?? null}
                options={clientOptions}
                onChange={(option) => form.setValue("client", option?.value ?? "", { shouldValidate: true })}
                placeholder={t("reservations.existingClient")}
                isLoading={clientsQuery.isPending}
              />
            </FormField>
          ) : (
            <>
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                <h3 className="mb-4 text-base font-semibold text-slate-950">{t("reservations.inlineClientTitle")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t("reservations.clientFields.fullName")} error={form.formState.errors.new_client?.full_name?.message}>
                    <Input {...form.register("new_client.full_name")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.phone")} error={form.formState.errors.new_client?.phone?.message}>
                    <Input {...form.register("new_client.phone")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.email")} error={form.formState.errors.new_client?.email?.message}>
                    <Input type="email" {...form.register("new_client.email")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.cin")} error={form.formState.errors.new_client?.cin?.message}>
                    <Input {...form.register("new_client.cin")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.drivingLicense")} error={form.formState.errors.new_client?.driving_license?.message}>
                    <Input {...form.register("new_client.driving_license")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.passport")} error={form.formState.errors.new_client?.passport?.message}>
                    <Input {...form.register("new_client.passport")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.address")} error={form.formState.errors.new_client?.address?.message} className="md:col-span-2">
                    <Input {...form.register("new_client.address")} />
                  </FormField>
                  <FormField label={t("reservations.clientFields.birthDate")} error={form.formState.errors.new_client?.birth_date?.message}>
                    <Input type="date" {...form.register("new_client.birth_date")} />
                  </FormField>
                </div>
              </div>
            </>
          )}

          <FormField label={t("reservations.advanceAmount")} error={form.formState.errors.advance_amount?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("advance_amount")} />
          </FormField>
          <FormField label={t("common.startDate")} error={form.formState.errors.start_date?.message}>
            <Input type="date" {...form.register("start_date")} />
          </FormField>
          <FormField label={t("common.endDate")} error={form.formState.errors.end_date?.message}>
            <Input type="date" {...form.register("end_date")} />
          </FormField>
          <FormField label={t("reservations.availableCar")} error={form.formState.errors.car?.message} className="md:col-span-2">
            <SearchableSelect
              inputId="reservation-car"
              value={carOptions.find((option) => option.value === selectedCarId) ?? null}
              options={carOptions}
              onChange={(option) => form.setValue("car", option?.value ?? "", { shouldValidate: true })}
              placeholder={startDate && endDate ? t("reservations.selectAvailableCar") : t("reservations.chooseDatesFirst")}
              isDisabled={!startDate || !endDate}
              isLoading={availableCarsQuery.isPending}
            />
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : t("reservations.createTitle")}
            </Button>
          </div>
        </form>
      </FormSection>

      {startDate && endDate && !availableCarsQuery.isPending && !carOptions.length ? (
        <EmptyState title={t("reservations.noCars")} description={t("reservations.noCarsDescription")} />
      ) : null}
    </div>
  );
}

function formatClientMeta(client: { cin: string; driving_license: string; passport: string }) {
  return [client.cin, client.driving_license, client.passport].filter(Boolean).join(" · ");
}
