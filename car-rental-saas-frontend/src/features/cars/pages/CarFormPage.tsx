import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { carSchema } from "@/components/forms/schemas";
import { carsKeys, createCar, getCar, getCarChoices, updateCar } from "@/features/cars/api";
import { carStatuses, fuelTypes, transmissionTypes } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";
import type { CarChoicesResponse } from "@/types/common";

type CarFormValues = z.infer<typeof carSchema>;

export default function CarFormPage({ mode }: { mode: "create" | "edit" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const carQuery = useQuery({
    queryKey: carsKeys.detail(id),
    queryFn: () => getCar(id),
    enabled: mode === "edit" && Boolean(id),
  });

  const carChoicesQuery = useQuery({
    queryKey: carsKeys.choices(),
    queryFn: getCarChoices,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carSchema) as never,
    defaultValues: {
      brand: "",
      model: "",
      plate_number: "",
      year: new Date().getFullYear(),
      color: "",
      fuel_type: "PETROL",
      transmission: "MANUAL",
      daily_price: 0,
      deposit_amount: 0,
      mileage: 0,
      status: "AVAILABLE",
    },
  });

  useEffect(() => {
    if (carQuery.data) {
      form.reset({
        brand: carQuery.data.brand,
        model: carQuery.data.model,
        plate_number: carQuery.data.plate_number,
        year: carQuery.data.year,
        color: carQuery.data.color,
        fuel_type: carQuery.data.fuel_type,
        transmission: carQuery.data.transmission,
        daily_price: Number(carQuery.data.daily_price),
        deposit_amount: Number(carQuery.data.deposit_amount),
        mileage: carQuery.data.mileage,
        status: carQuery.data.status,
      });
    }
  }, [carQuery.data, form]);

  const fallbackChoices = useMemo<CarChoicesResponse>(
    () => ({
      fuel_type: fuelTypes.map((value) => ({ value, label: formatEnumLabel(value) })),
      transmission: transmissionTypes.map((value) => ({ value, label: formatEnumLabel(value) })),
      status: carStatuses.map((value) => ({ value, label: formatEnumLabel(value) })),
    }),
    [],
  );

  const carChoices = carChoicesQuery.data ?? fallbackChoices;

  const mutation = useMutation({
    mutationFn: async (values: CarFormValues) => {
      setServerError(null);
      if (mode === "create") {
        return createCar(values);
      }

      return updateCar(id, values);
    },
    onSuccess: async (car) => {
      toast.success(mode === "create" ? "Car created successfully." : "Car updated successfully.");
      await queryClient.invalidateQueries({ queryKey: carsKeys.all });
      navigate(`/cars/${car.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      setServerError(getErrorMessage(error));
      toast.error("Unable to save car", { description: getErrorMessage(error) });
    },
  });

  if (mode === "edit" && carQuery.isError) {
    return <EmptyState title="Car not found" description="We could not load this car for editing." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? t("cars.addCar") : t("common.edit")}
        description={t("cars.vehicleDetailsDescription")}
        actions={
          <Link to={mode === "create" ? "/cars" : `/cars/${id}`}>
            <Button variant="outline">{t("common.cancel")}</Button>
          </Link>
        }
      />

      <FormSection title={t("cars.vehicleDetails")} description={t("cars.vehicleDetailsDescription")}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {serverError ? (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          ) : null}
          <FormField label={t("cars.fields.brand")} error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} />
          </FormField>
          <FormField label={t("cars.fields.model")} error={form.formState.errors.model?.message}>
            <Input {...form.register("model")} />
          </FormField>
          <FormField label={t("cars.fields.plateNumber")} error={form.formState.errors.plate_number?.message}>
            <Input {...form.register("plate_number")} />
          </FormField>
          <FormField label={t("cars.fields.year")} error={form.formState.errors.year?.message}>
            <Input type="number" {...form.register("year")} />
          </FormField>
          <FormField label={t("cars.fields.color")} error={form.formState.errors.color?.message}>
            <Input {...form.register("color")} />
          </FormField>
          <FormField label={t("cars.fields.fuelType")} error={form.formState.errors.fuel_type?.message}>
            <Select {...form.register("fuel_type")}>
              {carChoices.fuel_type.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("cars.fields.transmission")} error={form.formState.errors.transmission?.message}>
            <Select {...form.register("transmission")}>
              {carChoices.transmission.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("cars.fields.mileage")} error={form.formState.errors.mileage?.message}>
            <Input type="number" {...form.register("mileage")} />
          </FormField>
          <FormField label={t("cars.fields.dailyPrice")} error={form.formState.errors.daily_price?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("daily_price")} />
          </FormField>
          <FormField label={t("cars.fields.depositAmount")} error={form.formState.errors.deposit_amount?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("deposit_amount")} />
          </FormField>
          <FormField label={t("cars.fields.status")} error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              {carChoices.status.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending || carQuery.isPending}>
              {mutation.isPending ? "Saving..." : mode === "create" ? t("cars.addCar") : t("common.save")}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
