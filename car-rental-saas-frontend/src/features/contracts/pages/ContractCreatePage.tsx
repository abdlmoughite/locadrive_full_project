import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { contractSchema } from "@/components/forms/schemas";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canOverrideBlacklist } from "@/config/permissions";
import { useAuthStore } from "@/features/auth/authStore";
import { carsKeys, getAvailableCars } from "@/features/cars/api";
import { contractsKeys, createContract } from "@/features/contracts/api";
import { useClientLookup } from "@/hooks/useLookups";
import { getErrorMessage } from "@/lib/apiClient";

type ContractFormValues = z.infer<typeof contractSchema>;

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clientsQuery = useClientLookup();

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema) as never,
    defaultValues: {
      client: "",
      car: "",
      start_date: "",
      expected_return_date: "",
      daily_price: 0,
      discount_amount: 0,
      extra_fees: 0,
      start_mileage: 0,
      start_fuel_level: 100,
      blacklist_override_reason: "",
      client_blacklisted: false,
      can_override: canOverrideBlacklist(user),
    },
  });

  const clients = useMemo(() => clientsQuery.data?.results ?? [], [clientsQuery.data]);
  const [selectedClientId, startDate, endDate, selectedCarId] = useWatch({
    control: form.control,
    name: ["client", "start_date", "expected_return_date", "car"],
  });
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  useEffect(() => {
    form.setValue("client_blacklisted", Boolean(selectedClient?.blacklisted));
    form.setValue("can_override", canOverrideBlacklist(user));
  }, [form, selectedClient?.blacklisted, user]);

  const availableCarsQuery = useQuery({
    queryKey: carsKeys.available({ start_date: startDate, end_date: endDate }),
    queryFn: () => getAvailableCars(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });

  const selectedCar = availableCarsQuery.data?.find((car) => car.id === selectedCarId);

  useEffect(() => {
    if (selectedCar && !form.getValues("daily_price")) {
      form.setValue("daily_price", Number(selectedCar.daily_price));
    }
  }, [form, selectedCar]);

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: `${client.full_name} · ${client.phone}`,
        description: [client.cin, client.driving_license, client.passport].filter(Boolean).join(" · "),
      })),
    [clients],
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

  const mutation = useMutation({
    mutationFn: (values: ContractFormValues) => {
      if (selectedClient?.blacklisted && user?.role === "AGENCY_AGENT") {
        throw new Error("Blacklisted clients cannot be contracted by agency agents.");
      }

      return createContract({
        client: values.client,
        car: values.car,
        start_date: values.start_date,
        expected_return_date: values.expected_return_date,
        daily_price: values.daily_price,
        discount_amount: values.discount_amount,
        extra_fees: values.extra_fees,
        start_mileage: values.start_mileage,
        start_fuel_level: values.start_fuel_level,
        blacklist_override_reason: values.blacklist_override_reason,
      });
    },
    onSuccess: async (contract) => {
      toast.success("Contract created successfully.");
      await queryClient.invalidateQueries({ queryKey: contractsKeys.all });
      navigate(`/contracts/${contract.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create contract", { description: getErrorMessage(error) });
    },
  });

  const agentBlockedByBlacklist = Boolean(selectedClient?.blacklisted && user?.role === "AGENCY_AGENT");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create contract"
        description="The backend enforces availability, blacklist rules, and automatic invoice creation when the contract is created."
        actions={
          <Link to="/contracts">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      {selectedClient?.blacklisted ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="font-semibold">Blacklisted client selected</p>
          <p className="mt-1 text-sm">
            {user?.role === "AGENCY_AGENT"
              ? "Agency agents cannot create contracts for blacklisted clients."
              : "Agency owners can continue only by providing a clear override reason."}
          </p>
        </div>
      ) : null}

      <FormSection title="Contract setup" description="Cars are filtered by availability once both dates are chosen.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Client" error={form.formState.errors.client?.message}>
            <SearchableSelect
              inputId="contract-client"
              value={clientOptions.find((option) => option.value === selectedClientId) ?? null}
              options={clientOptions}
              onChange={(option) => form.setValue("client", option?.value ?? "", { shouldValidate: true })}
              placeholder="Select client"
              isLoading={clientsQuery.isPending}
            />
          </FormField>
          <FormField label="Daily price" error={form.formState.errors.daily_price?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("daily_price")} />
          </FormField>
          <FormField label="Start date" error={form.formState.errors.start_date?.message}>
            <Input type="date" {...form.register("start_date")} />
          </FormField>
          <FormField label="Expected return date" error={form.formState.errors.expected_return_date?.message}>
            <Input type="date" {...form.register("expected_return_date")} />
          </FormField>
          <FormField label="Available car" error={form.formState.errors.car?.message}>
            <SearchableSelect
              inputId="contract-car"
              value={carOptions.find((option) => option.value === selectedCarId) ?? null}
              options={carOptions}
              onChange={(option) => form.setValue("car", option?.value ?? "", { shouldValidate: true })}
              placeholder={startDate && endDate ? "Select available car" : "Choose dates first"}
              isDisabled={!startDate || !endDate}
              isLoading={availableCarsQuery.isPending}
            />
          </FormField>
          <FormField label="Discount amount" error={form.formState.errors.discount_amount?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("discount_amount")} />
          </FormField>
          <FormField label="Extra fees" error={form.formState.errors.extra_fees?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("extra_fees")} />
          </FormField>
          <FormField label="Start mileage" error={form.formState.errors.start_mileage?.message}>
            <Input type="number" min="0" {...form.register("start_mileage")} />
          </FormField>
          <FormField label="Start fuel level" error={form.formState.errors.start_fuel_level?.message}>
            <Input type="number" min="0" max="100" step="0.01" {...form.register("start_fuel_level")} />
          </FormField>
          {selectedClient?.blacklisted && canOverrideBlacklist(user) ? (
            <FormField label="Blacklist override reason" error={form.formState.errors.blacklist_override_reason?.message}>
              <Input {...form.register("blacklist_override_reason")} />
            </FormField>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending || agentBlockedByBlacklist}>
              {mutation.isPending ? "Creating..." : agentBlockedByBlacklist ? "Blocked for blacklisted client" : "Create contract"}
            </Button>
          </div>
        </form>
      </FormSection>

      {startDate && endDate && !availableCarsQuery.isPending && !(availableCarsQuery.data ?? []).length ? (
        <EmptyState title="No cars available" description="All cars are reserved, rented, or blocked for this date range." />
      ) : null}

      {selectedCar ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-950">Selected car pricing snapshot</p>
          <p className="mt-2 text-sm text-slate-600">
            Daily price: <MoneyDisplay amount={selectedCar.daily_price} /> · Deposit: <MoneyDisplay amount={selectedCar.deposit_amount} />
          </p>
        </div>
      ) : null}
    </div>
  );
}
