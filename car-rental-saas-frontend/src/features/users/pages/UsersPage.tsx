import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/tables/DataTable";
import { FormField } from "@/components/forms/FormField";
import { useAuthStore } from "@/features/auth/authStore";
import { getErrorMessage } from "@/lib/apiClient";
import { getRoleLabel } from "@/lib/formatters";
import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { canManageUsers, isAgencyOwner, isSuperadmin } from "@/config/permissions";
import { createUser, getUsers, suspendUser, activateUser, usersKeys } from "@/features/users/api";

const userSchema = z.object({
  full_name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  role: z.string().min(1),
  status: z.string().min(1),
  agency: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage({ adminScope = false }: { adminScope?: boolean }) {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: usersKeys.list({ page_size: 100 }),
    queryFn: () => getUsers({ page_size: 100 }),
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema) as never,
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: adminScope ? "AGENCY_OWNER" : "AGENCY_AGENT",
      status: "ACTIVE",
      agency: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      toast.success("User created successfully.");
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create user", { description: getErrorMessage(error) });
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: async () => {
      toast.success("User activated.");
      await queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: suspendUser,
    onSuccess: async () => {
      toast.success("User suspended.");
      await queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });

  const canAccessPage = adminScope ? isSuperadmin(user) : isAgencyOwner(user);

  if (!canManageUsers(user) || !canAccessPage) {
    return <PageHeader title="Users" description="You do not have permission to manage users." />;
  }

  const visibleUsers = usersQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={adminScope ? "Global users" : "Agency users"}
        description={
          adminScope
            ? "Create tenant owners and review all platform accounts."
            : "Manage staff accounts for your agency. Owners can create agents only."
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <DataTable
        columns={[
          {
            key: "full_name",
            header: "User",
            render: (item) => (
              <div>
                <p className="font-semibold text-slate-950">{item.full_name}</p>
                <p className="text-xs text-slate-500">{item.email}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", render: (item) => getRoleLabel(item.role) },
          { key: "status", header: "Status", render: (item) => <BadgeStatus status={item.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (item) => (
              <div className="flex gap-2">
                {item.status === "ACTIVE" ? (
                  <Button variant="outline" size="sm" onClick={() => suspendMutation.mutate(item.id)}>
                    Suspend
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(item.id)}>
                    Activate
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={visibleUsers}
        loading={usersQuery.isPending}
        error={usersQuery.isError ? "Could not load users." : null}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create user"
        description={adminScope ? "Superadmins can create owners and superadmins." : "Owners can create agents for their agency."}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="user-form" type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create user"}
            </Button>
          </>
        }
      >
        <form id="user-form" className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => createUserMutation.mutate(values))}>
          <FormField label="Full name" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Password" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register("password")} />
          </FormField>
          <FormField label="Role" error={form.formState.errors.role?.message}>
            <Select {...form.register("role")}>
              {adminScope ? (
                <>
                  <option value="SUPERADMIN">Superadmin</option>
                  <option value="AGENCY_OWNER">Agency owner</option>
                  <option value="AGENCY_AGENT">Agency agent</option>
                </>
              ) : (
                <option value="AGENCY_AGENT">Agency agent</option>
              )}
            </Select>
          </FormField>
          <FormField label="Status" error={form.formState.errors.status?.message}>
            <Select {...form.register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
