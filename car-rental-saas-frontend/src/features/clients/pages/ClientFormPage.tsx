import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { clientSchema } from "@/components/forms/schemas";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientsKeys, checkDuplicateClient, createClient, getClient, updateClient } from "@/features/clients/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/lib/apiClient";

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [allowCreateDespiteDuplicate, setAllowCreateDespiteDuplicate] = useState(false);

  const clientQuery = useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: () => getClient(id),
    enabled: mode === "edit" && Boolean(id),
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as never,
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      cin: "",
      passport: "",
      driving_license: "",
      address: "",
      birth_date: "",
    },
  });

  useEffect(() => {
    if (clientQuery.data) {
      form.reset({
        full_name: clientQuery.data.full_name,
        phone: clientQuery.data.phone,
        email: clientQuery.data.email,
        cin: clientQuery.data.cin,
        passport: clientQuery.data.passport,
        driving_license: clientQuery.data.driving_license,
        address: clientQuery.data.address,
        birth_date: clientQuery.data.birth_date ?? "",
      });
    }
  }, [clientQuery.data, form]);

  const watchedValues = useWatch({
    control: form.control,
    name: ["cin", "driving_license", "passport", "phone", "email"],
  });
  const duplicateParams = useMemo(
    () => ({
      cin: watchedValues[0] || undefined,
      driving_license: watchedValues[1] || undefined,
      passport: watchedValues[2] || undefined,
      phone: watchedValues[3] || undefined,
      email: watchedValues[4] || undefined,
    }),
    [watchedValues],
  );

  const debouncedDuplicateParams = {
    cin: useDebouncedValue(duplicateParams.cin ?? "", 300) || undefined,
    driving_license: useDebouncedValue(duplicateParams.driving_license ?? "", 300) || undefined,
    passport: useDebouncedValue(duplicateParams.passport ?? "", 300) || undefined,
    phone: useDebouncedValue(duplicateParams.phone ?? "", 300) || undefined,
    email: useDebouncedValue(duplicateParams.email ?? "", 300) || undefined,
  };

  const duplicateCheckEnabled =
    mode === "create" &&
    Object.values(debouncedDuplicateParams).some((value) => Boolean(value));

  const duplicateQuery = useQuery({
    queryKey: clientsKeys.check(debouncedDuplicateParams),
    queryFn: () => checkDuplicateClient(debouncedDuplicateParams),
    enabled: duplicateCheckEnabled,
  });

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (mode === "create") {
        return createClient(values);
      }

      return updateClient(id, values);
    },
    onSuccess: async (client) => {
      toast.success(mode === "create" ? "Client created successfully." : "Client updated successfully.");
      await queryClient.invalidateQueries({ queryKey: clientsKeys.all });
      navigate(`/clients/${client.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to save client", { description: getErrorMessage(error) });
    },
  });

  const duplicateMatches = duplicateQuery.data?.matches
    ? Object.values(duplicateQuery.data.matches).flat()
    : [];
  const firstMatch = duplicateMatches[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Create client" : "Edit client"}
        description="Clients are agency records only. They do not receive login access to this SaaS platform."
        actions={
          <Link to={mode === "create" ? "/clients" : `/clients/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      {mode === "create" && duplicateQuery.data?.exists && !allowCreateDespiteDuplicate ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-amber-900">Potential duplicate client found</p>
                <p className="text-sm text-amber-800">
                  Review the existing record before creating a new one. This helps avoid duplicate contracts and debt tracking.
                </p>
              </div>
              {firstMatch ? (
                <div className="rounded-2xl border border-amber-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{firstMatch.full_name}</p>
                  <p>{firstMatch.phone || "-"}</p>
                  <p>{firstMatch.email || "-"}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {firstMatch ? (
                  <Link to={`/clients/${firstMatch.id}`}>
                    <Button variant="outline">View existing client</Button>
                  </Link>
                ) : null}
                <Button variant="outline" onClick={() => setAllowCreateDespiteDuplicate(true)}>
                  Continue anyway
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <FormSection title="Client profile" description="The backend will still enforce unique CIN, passport, and driving licence rules per agency.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Full name" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} />
          </FormField>
          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Birth date" error={form.formState.errors.birth_date?.message}>
            <Input type="date" {...form.register("birth_date")} />
          </FormField>
          <FormField label="CIN" error={form.formState.errors.cin?.message}>
            <Input {...form.register("cin")} />
          </FormField>
          <FormField label="Passport" error={form.formState.errors.passport?.message}>
            <Input {...form.register("passport")} />
          </FormField>
          <FormField label="Driving licence" error={form.formState.errors.driving_license?.message}>
            <Input {...form.register("driving_license")} />
          </FormField>
          <FormField label="Address" error={form.formState.errors.address?.message}>
            <Input {...form.register("address")} />
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending || clientQuery.isPending}>
              {mutation.isPending ? "Saving..." : mode === "create" ? "Create client" : "Save changes"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
