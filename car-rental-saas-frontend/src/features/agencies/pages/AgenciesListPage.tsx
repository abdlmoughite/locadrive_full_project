import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/tables/DataTable";
import { FormField } from "@/components/forms/FormField";
import { agenciesKeys, createAgency, getAgencies } from "@/features/agencies/api";
import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { getErrorMessage } from "@/lib/apiClient";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const agencySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(3),
  email: z.email(),
  address: z.string().default(""),
});

type AgencyFormValues = z.infer<typeof agencySchema>;

export default function AgenciesListPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const queryClient = useQueryClient();

  const agenciesQuery = useQuery({
    queryKey: agenciesKeys.list({ search: debouncedSearch, page_size: 100 }),
    queryFn: () => getAgencies({ search: debouncedSearch, page_size: 100 }),
  });

  const createAgencyMutation = useMutation({
    mutationFn: createAgency,
    onSuccess: async () => {
      toast.success("Agency created successfully.");
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: agenciesKeys.lists() });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create agency", { description: getErrorMessage(error) });
    },
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agencies"
        description="Manage tenant agencies, onboarding details, and subscription visibility across the SaaS."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New agency
          </Button>
        }
      />

      <div className="max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agencies by name, phone, or email" />
      </div>

      {agenciesQuery.data?.results.length ? (
        <DataTable
          columns={[
            {
              key: "agency",
              header: "Agency",
              render: (agency) => (
                <div>
                  <p className="font-semibold text-slate-950">{agency.name}</p>
                  <p className="text-xs text-slate-500">{agency.address || "No address set"}</p>
                </div>
              ),
            },
            { key: "email", header: "Email", render: (agency) => agency.email },
            { key: "phone", header: "Phone", render: (agency) => agency.phone },
            { key: "status", header: "Subscription", render: (agency) => <BadgeStatus status={agency.subscription_status} /> },
            {
              key: "actions",
              header: "Actions",
              render: (agency) => (
                <Link className="font-semibold text-blue-600 hover:text-blue-700" to={`/admin/agencies/${agency.id}`}>
                  View details
                </Link>
              ),
            },
          ]}
          rows={agenciesQuery.data.results}
          loading={agenciesQuery.isPending}
          error={agenciesQuery.isError ? "Could not load agencies." : null}
        />
      ) : (
        <EmptyState
          title="No agencies found"
          description="New SaaS agencies you create here will appear in the platform dashboard."
          action={
            <Button onClick={() => setOpen(true)}>
              <Building2 className="h-4 w-4" />
              Create first agency
            </Button>
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create agency"
        description="Create a new tenant agency profile."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="agency-form" type="submit" disabled={createAgencyMutation.isPending}>
              {createAgencyMutation.isPending ? "Creating..." : "Create agency"}
            </Button>
          </>
        }
      >
        <form id="agency-form" className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => createAgencyMutation.mutate(values))}>
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
        </form>
      </Modal>
    </div>
  );
}
