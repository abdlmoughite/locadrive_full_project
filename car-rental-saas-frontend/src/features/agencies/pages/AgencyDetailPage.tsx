import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agenciesKeys, getAgency, updateAgency } from "@/features/agencies/api";
import { getErrorMessage } from "@/lib/apiClient";
import { formatDate } from "@/lib/formatters";

const agencySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(3),
  email: z.email(),
  address: z.string().default(""),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

export default function AgencyDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const agencyQuery = useQuery({
    queryKey: agenciesKeys.detail(id),
    queryFn: () => getAgency(id),
    enabled: Boolean(id),
  });

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencySchema) as never,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  useEffect(() => {
    if (agencyQuery.data) {
      form.reset({
        name: agencyQuery.data.name,
        phone: agencyQuery.data.phone,
        email: agencyQuery.data.email,
        address: agencyQuery.data.address,
      });
    }
  }, [agencyQuery.data, form]);

  const updateAgencyMutation = useMutation({
    mutationFn: (values: AgencyFormValues) => updateAgency(id, values),
    onSuccess: async () => {
      toast.success("Agency updated successfully.");
      await queryClient.invalidateQueries({ queryKey: agenciesKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: agenciesKeys.lists() });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to update agency", { description: getErrorMessage(error) });
    },
  });

  if (agencyQuery.isPending) {
    return <LoadingState title="Loading agency profile..." />;
  }

  if (agencyQuery.isError || !agencyQuery.data) {
    return <ErrorState description="The requested agency could not be loaded." />;
  }

  const agency = agencyQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={agency.name}
        description="Edit tenant details and review subscription posture."
        actions={<BadgeStatus status={agency.subscription_status} />}
      />

      <DetailPanel
        title="Agency overview"
        description="Core identity and account timestamps."
        items={[
          { label: "Email", value: agency.email },
          { label: "Phone", value: agency.phone },
          { label: "Address", value: agency.address || "-" },
          { label: "Created", value: formatDate(agency.created_at) },
        ]}
      />

      <FormSection>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => updateAgencyMutation.mutate(values))}>
          <FormField label="Agency name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Address" error={form.formState.errors.address?.message}>
            <Input {...form.register("address")} />
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit" disabled={updateAgencyMutation.isPending}>
              {updateAgencyMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
