import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { agenciesKeys, createSubscription, getAgencies, getSubscriptions } from "@/features/agencies/api";
import { getErrorMessage } from "@/lib/apiClient";
import { formatDate, formatMoney } from "@/lib/formatters";

const subscriptionSchema = z.object({
  agency: z.string().min(1),
  plan_name: z.string().min(2),
  price: z.coerce.number().min(0),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  status: z.string().min(1),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export default function SubscriptionsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const subscriptionsQuery = useQuery({
    queryKey: agenciesKeys.subscriptions,
    queryFn: () => getSubscriptions({ page_size: 100 }),
  });
  const agenciesQuery = useQuery({
    queryKey: agenciesKeys.lists(),
    queryFn: () => getAgencies({ page_size: 100 }),
  });

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema) as never,
    defaultValues: {
      agency: "",
      plan_name: "Pro",
      price: 0,
      start_date: "",
      end_date: "",
      status: "ACTIVE",
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: async () => {
      toast.success("Subscription created successfully.");
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: agenciesKeys.subscriptions });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create subscription", { description: getErrorMessage(error) });
    },
  });

  const agencies = useMemo(() => agenciesQuery.data?.results ?? [], [agenciesQuery.data]);
  const selectedAgencyId = useWatch({
    control: form.control,
    name: "agency",
  });
  const agencyOptions = useMemo(
    () =>
      agencies.map((agency) => ({
        value: agency.id,
        label: agency.name,
        description: agency.email || agency.phone || undefined,
      })),
    [agencies],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Track plan lifecycle, pricing, and active tenant billing windows."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New subscription
          </Button>
        }
      />

      <DataTable
        columns={[
          {
            key: "agency",
            header: "Agency",
            render: (subscription) => agencies.find((agency) => agency.id === subscription.agency)?.name ?? subscription.agency,
          },
          { key: "plan_name", header: "Plan", render: (subscription) => subscription.plan_name },
          { key: "price", header: "Price", render: (subscription) => formatMoney(subscription.price) },
          { key: "start_date", header: "Start", render: (subscription) => formatDate(subscription.start_date) },
          { key: "end_date", header: "End", render: (subscription) => formatDate(subscription.end_date) },
          { key: "status", header: "Status", render: (subscription) => <BadgeStatus status={subscription.status} /> },
        ]}
        rows={subscriptionsQuery.data?.results ?? []}
        loading={subscriptionsQuery.isPending || agenciesQuery.isPending}
        error={subscriptionsQuery.isError ? "Could not load subscriptions." : null}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create subscription"
        description="Assign a billing plan to an agency."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="subscription-form" type="submit" disabled={createSubscriptionMutation.isPending}>
              {createSubscriptionMutation.isPending ? "Creating..." : "Create subscription"}
            </Button>
          </>
        }
      >
        <form
          id="subscription-form"
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) => createSubscriptionMutation.mutate(values))}
        >
          <FormField label="Agency" error={form.formState.errors.agency?.message}>
            <SearchableSelect
              inputId="subscription-agency"
              value={agencyOptions.find((option) => option.value === selectedAgencyId) ?? null}
              options={agencyOptions}
              onChange={(option) => form.setValue("agency", option?.value ?? "", { shouldValidate: true })}
              placeholder="Select agency"
              isLoading={agenciesQuery.isPending}
            />
          </FormField>
          <FormField label="Plan name" error={form.formState.errors.plan_name?.message}>
            <Input {...form.register("plan_name")} />
          </FormField>
          <FormField label="Price" error={form.formState.errors.price?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("price")} />
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PAST_DUE">Past due</option>
            </Select>
          </FormField>
          <FormField label="Start date" error={form.formState.errors.start_date?.message}>
            <Input type="date" {...form.register("start_date")} />
          </FormField>
          <FormField label="End date" error={form.formState.errors.end_date?.message}>
            <Input type="date" {...form.register("end_date")} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
