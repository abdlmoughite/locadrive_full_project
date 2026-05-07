import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { incidentSchema } from "@/components/forms/schemas";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createIncident, incidentsKeys } from "@/features/incidents/api";
import { useClientLookup, useContractLookup, useCarLookup } from "@/hooks/useLookups";
import { incidentStatuses, incidentTypes } from "@/lib/constants";
import { getErrorMessage } from "@/lib/apiClient";
import { formatEnumLabel } from "@/lib/formatters";

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function IncidentCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();
  const carsQuery = useCarLookup();
  const contractsQuery = useContractLookup();

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

  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: async (incident) => {
      toast.success("Incident created successfully.");
      await queryClient.invalidateQueries({ queryKey: incidentsKeys.all });
      navigate(`/incidents/${incident.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create incident", { description: getErrorMessage(error) });
    },
  });

  const [clientValue, carValue, contractValue] = useWatch({
    control: form.control,
    name: ["client", "car", "contract"],
  });
  const clientOptions = useMemo(
    () =>
      (clientsQuery.data?.results ?? []).map((client) => ({
        value: client.id,
        label: `${client.full_name} · ${client.phone}`,
        description: client.email || client.cin || client.driving_license || client.passport || undefined,
      })),
    [clientsQuery.data],
  );
  const carOptions = useMemo(
    () =>
      (carsQuery.data?.results ?? []).map((car) => ({
        value: car.id,
        label: `${car.plate_number} · ${car.brand} ${car.model}`,
        description: `${car.status} · ${car.daily_price}`,
      })),
    [carsQuery.data],
  );
  const contractOptions = useMemo(
    () =>
      (contractsQuery.data?.results ?? []).map((contract) => ({
        value: contract.id,
        label: contract.contract_number,
        description: `${contract.start_date} · ${contract.status}`,
      })),
    [contractsQuery.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create incident"
        description="Incident records can drive invoice generation and history events on the backend."
        actions={
          <Link to="/incidents">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <FormSection title="Incident details">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Client" error={form.formState.errors.client?.message}>
            <SearchableSelect
              inputId="incident-client"
              value={clientOptions.find((option) => option.value === clientValue) ?? null}
              options={clientOptions}
              onChange={(option) => form.setValue("client", option?.value ?? "", { shouldValidate: true })}
              placeholder="No client"
              isLoading={clientsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label="Car" error={form.formState.errors.car?.message}>
            <SearchableSelect
              inputId="incident-car"
              value={carOptions.find((option) => option.value === carValue) ?? null}
              options={carOptions}
              onChange={(option) => form.setValue("car", option?.value ?? "", { shouldValidate: true })}
              placeholder="No car"
              isLoading={carsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label="Contract" error={form.formState.errors.contract?.message}>
            <SearchableSelect
              inputId="incident-contract"
              value={contractOptions.find((option) => option.value === contractValue) ?? null}
              options={contractOptions}
              onChange={(option) => form.setValue("contract", option?.value ?? "", { shouldValidate: true })}
              placeholder="No contract"
              isLoading={contractsQuery.isPending}
              isClearable
            />
          </FormField>
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create incident"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
