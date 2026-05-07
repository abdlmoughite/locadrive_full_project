import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { incidentSchema } from "@/components/forms/schemas";
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
import { getClient } from "@/features/clients/api";
import { getContract } from "@/features/contracts/api";
import { getIncident, incidentsKeys, resolveIncident, updateIncident } from "@/features/incidents/api";
import { incidentStatuses, incidentTypes } from "@/lib/constants";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function IncidentDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  const incidentQuery = useQuery({
    queryKey: incidentsKeys.detail(id),
    queryFn: () => getIncident(id),
    enabled: Boolean(id),
  });

  const clientQuery = useQuery({
    queryKey: ["incident-client", incidentQuery.data?.client],
    queryFn: () => getClient(incidentQuery.data!.client!),
    enabled: Boolean(incidentQuery.data?.client),
  });

  const carQuery = useQuery({
    queryKey: ["incident-car", incidentQuery.data?.car],
    queryFn: () => getCar(incidentQuery.data!.car!),
    enabled: Boolean(incidentQuery.data?.car),
  });

  const contractQuery = useQuery({
    queryKey: ["incident-contract", incidentQuery.data?.contract],
    queryFn: () => getContract(incidentQuery.data!.contract!),
    enabled: Boolean(incidentQuery.data?.contract),
  });

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema) as never,
    defaultValues: {
      client: "",
      car: "",
      contract: "",
      type: "OTHER",
      description: "",
      amount: 0,
      status: "OPEN",
    },
  });

  useEffect(() => {
    if (incidentQuery.data) {
      form.reset({
        client: incidentQuery.data.client ?? "",
        car: incidentQuery.data.car ?? "",
        contract: incidentQuery.data.contract ?? "",
        type: incidentQuery.data.type,
        description: incidentQuery.data.description,
        amount: Number(incidentQuery.data.amount),
        status: incidentQuery.data.status,
      });
    }
  }, [form, incidentQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (values: IncidentFormValues) => updateIncident(id, values),
    onSuccess: async () => {
      toast.success("Incident updated.");
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to update incident", { description: getErrorMessage(error) });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveIncident,
    onSuccess: async () => {
      toast.success("Incident resolved.");
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
    },
    onError: (error) => toast.error("Unable to resolve incident", { description: getErrorMessage(error) }),
  });

  if (incidentQuery.isPending) {
    return <LoadingState title="Loading incident..." />;
  }

  if (incidentQuery.isError || !incidentQuery.data) {
    return <ErrorState description="This incident could not be loaded." />;
  }

  const incident = incidentQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatEnumLabel(incident.type)}
        description="Incident detail and update form."
        actions={
          <>
            <Link to="/incidents">
              <Button variant="outline">Back to list</Button>
            </Link>
            {incident.status !== "RESOLVED" ? (
              <Button onClick={() => resolveMutation.mutate(incident.id)}>Resolve</Button>
            ) : null}
          </>
        }
      />

      <DetailPanel
        title="Incident overview"
        description="Incidents can generate invoiceable amounts and history events."
        items={[
          { label: "Status", value: formatEnumLabel(incident.status) },
          { label: "Client", value: clientQuery.data?.full_name ?? "-" },
          { label: "Car", value: carQuery.data?.plate_number ?? "-" },
          { label: "Contract", value: contractQuery.data?.contract_number ?? "-" },
          { label: "Amount", value: <MoneyDisplay amount={incident.amount} /> },
          { label: "Created", value: formatDateTime(incident.created_at) },
        ]}
      />

      <FormSection title="Update incident">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
          <FormField label="Type" error={form.formState.errors.type?.message}>
            <Select {...form.register("type")}>
              {incidentTypes.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount" error={form.formState.errors.amount?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("amount")} />
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              {incidentStatuses.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description" error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
