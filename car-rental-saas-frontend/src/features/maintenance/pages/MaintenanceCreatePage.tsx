import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { maintenanceSchema } from "@/components/forms/schemas";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createMaintenanceRecord, maintenanceKeys } from "@/features/maintenance/api";
import { useCarLookup } from "@/hooks/useLookups";
import { maintenanceStatuses } from "@/lib/constants";
import { getErrorMessage } from "@/lib/apiClient";
import { formatEnumLabel } from "@/lib/formatters";

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export default function MaintenanceCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const carsQuery = useCarLookup({ activeOnly: true });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema) as never,
    defaultValues: {
      car: "",
      type: "",
      description: "",
      cost: 0,
      started_at: new Date().toISOString().slice(0, 16),
      estimated_duration_hours: 2,
      status: "SCHEDULED",
    },
  });

  const mutation = useMutation({
    mutationFn: createMaintenanceRecord,
    onSuccess: async (record) => {
      toast.success("Maintenance record created successfully.");
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      navigate(`/maintenance/${record.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create maintenance record", { description: getErrorMessage(error) });
    },
  });

  const carOptions = useMemo(
    () =>
      (carsQuery.data?.results ?? []).map((car) => ({
        value: car.id,
        label: `${car.plate_number} · ${car.brand} ${car.model}`,
        description: `${formatEnumLabel(car.status)} · ${car.daily_price}`,
      })),
    [carsQuery.data],
  );
  const selectedCarId = useWatch({
    control: form.control,
    name: "car",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.createTitle")}
        description={t("maintenance.createDescription")}
        actions={
          <Link to="/maintenance">
            <Button variant="outline">{t("common.cancel")}</Button>
          </Link>
        }
      />

      <FormSection title={t("maintenance.detailsTitle")} description={t("maintenance.detailsDescription")}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label={t("maintenance.fields.car")} error={form.formState.errors.car?.message}>
              <SearchableSelect
                inputId="maintenance-car"
                value={carOptions.find((option) => option.value === selectedCarId) ?? null}
                options={carOptions}
                onChange={(option) => form.setValue("car", option?.value ?? "", { shouldValidate: true })}
                placeholder={t("maintenance.fields.car")}
              isLoading={carsQuery.isPending}
            />
          </FormField>
          <FormField label={t("maintenance.fields.type")} error={form.formState.errors.type?.message}>
            <Input {...form.register("type")} />
          </FormField>
          <FormField label={t("maintenance.fields.cost")} error={form.formState.errors.cost?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("cost")} />
          </FormField>
          <FormField label={t("maintenance.fields.status")} error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              {maintenanceStatuses.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("maintenance.fields.startedAt")} error={form.formState.errors.started_at?.message}>
            <Input type="datetime-local" {...form.register("started_at")} />
          </FormField>
          <FormField label={t("maintenance.fields.estimatedDuration")} error={form.formState.errors.estimated_duration_hours?.message}>
            <Input type="number" min="0" step="0.25" {...form.register("estimated_duration_hours")} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label={t("maintenance.fields.description")} error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : t("maintenance.new")}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
