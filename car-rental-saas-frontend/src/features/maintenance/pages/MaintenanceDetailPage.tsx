import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { maintenanceSchema } from "@/components/forms/schemas";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCar } from "@/features/cars/api";
import {
  cancelMaintenanceRecord,
  completeMaintenanceRecord,
  getMaintenanceRecord,
  maintenanceKeys,
  updateMaintenanceRecord,
} from "@/features/maintenance/api";
import { maintenanceStatuses } from "@/lib/constants";
import { getErrorMessage } from "@/lib/apiClient";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { toDateTimeLocalInput } from "@/lib/utils";

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export default function MaintenanceDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  const recordQuery = useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: () => getMaintenanceRecord(id),
    enabled: Boolean(id),
  });

  const carQuery = useQuery({
    queryKey: ["maintenance-car", recordQuery.data?.car],
    queryFn: () => getCar(recordQuery.data!.car),
    enabled: Boolean(recordQuery.data?.car),
  });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema) as never,
    defaultValues: {
      car: "",
      type: "",
      description: "",
      cost: 0,
      started_at: "",
      estimated_duration_hours: 0,
      status: "SCHEDULED",
    },
  });

  useEffect(() => {
    if (recordQuery.data) {
      form.reset({
        car: recordQuery.data.car,
        type: recordQuery.data.type,
        description: recordQuery.data.description,
        cost: Number(recordQuery.data.cost),
        started_at: toDateTimeLocalInput(recordQuery.data.started_at),
        estimated_duration_hours: Number(recordQuery.data.estimated_duration_hours),
        status: recordQuery.data.status,
      });
    }
  }, [form, recordQuery.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
  };

  const updateMutation = useMutation({
    mutationFn: (values: MaintenanceFormValues) => updateMaintenanceRecord(id, values),
    onSuccess: async () => {
      toast.success("Maintenance record updated.");
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to update maintenance", { description: getErrorMessage(error) });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeMaintenanceRecord,
    onSuccess: async () => {
      toast.success(t("maintenance.completeSuccess"));
      await refresh();
    },
    onError: (error) => toast.error(t("common.complete"), { description: getErrorMessage(error) }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelMaintenanceRecord,
    onSuccess: async () => {
      toast.success(t("maintenance.cancelSuccess"));
      await refresh();
    },
    onError: (error) => toast.error(t("common.cancel"), { description: getErrorMessage(error) }),
  });

  if (recordQuery.isPending) {
    return <LoadingState title="Loading maintenance record..." />;
  }

  if (recordQuery.isError || !recordQuery.data) {
    return <ErrorState description="This maintenance record could not be loaded." />;
  }

  const record = recordQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={record.type}
        description={t("maintenance.description")}
        actions={
          <>
            <Link to="/maintenance">
              <Button variant="outline">{t("common.backToList")}</Button>
            </Link>
            {record.status !== "COMPLETED" && record.status !== "CANCELLED" ? (
              <Button onClick={() => completeMutation.mutate(record.id)}>{t("common.complete")}</Button>
            ) : null}
            {record.status !== "COMPLETED" && record.status !== "CANCELLED" ? (
              <Button variant="danger" onClick={() => cancelMutation.mutate(record.id)}>
                {t("common.cancel")}
              </Button>
            ) : null}
          </>
        }
      />

      <DetailPanel
        title={t("maintenance.detailsTitle")}
        description={t("maintenance.detailsDescription")}
        items={[
          {
            label: t("maintenance.fields.car"),
            value: carQuery.data ? `${carQuery.data.plate_number} · ${carQuery.data.brand} ${carQuery.data.model}` : record.car,
          },
          { label: t("common.status"), value: formatEnumLabel(record.status) },
          { label: t("maintenance.fields.cost"), value: <MoneyDisplay amount={record.cost} /> },
          { label: t("maintenance.fields.startedAt"), value: formatDateTime(record.started_at) },
          {
            label: t("maintenance.fields.estimatedEnd"),
            value: record.estimated_end_at ? formatDateTime(record.estimated_end_at) : `${record.estimated_duration_hours} h`,
          },
          { label: "Created", value: formatDateTime(record.created_at) },
        ]}
      />

      <FormSection title={t("common.edit")}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <FormField label={t("maintenance.fields.type")} error={form.formState.errors.type?.message}>
            <Input {...form.register("type")} />
          </FormField>
          <FormField label={t("maintenance.fields.cost")} error={form.formState.errors.cost?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("cost")} />
          </FormField>
          <FormField label={t("maintenance.fields.startedAt")} error={form.formState.errors.started_at?.message}>
            <Input type="datetime-local" {...form.register("started_at")} />
          </FormField>
          <FormField label={t("maintenance.fields.estimatedDuration")} error={form.formState.errors.estimated_duration_hours?.message}>
            <Input type="number" min="0" step="0.25" {...form.register("estimated_duration_hours")} />
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
          <div className="md:col-span-2">
            <FormField label={t("maintenance.fields.description")} error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : t("common.save")}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
