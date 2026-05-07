import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { invoiceSchema } from "@/components/forms/schemas";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice, financeKeys } from "@/features/invoices/api";
import { useClientLookup, useContractLookup } from "@/hooks/useLookups";
import { invoiceTypes } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();
  const contractsQuery = useContractLookup();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as never,
    defaultValues: {
      client: "",
      contract: "",
      type: "RENTAL_INVOICE",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      notes: "",
      items: [{ description: "", quantity: 1, unit_price: 0 }],
    },
  });

  const itemsArray = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) ?? [];
  const liveSubtotal = watchedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async (invoice) => {
      toast.success("Invoice created successfully.");
      await queryClient.invalidateQueries({ queryKey: financeKeys.invoices });
      navigate(`/invoices/${invoice.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to create invoice", { description: getErrorMessage(error) });
    },
  });

  const clients = useMemo(() => clientsQuery.data?.results ?? [], [clientsQuery.data]);
  const contracts = useMemo(() => contractsQuery.data?.results ?? [], [contractsQuery.data]);
  const selectedClientId = useWatch({
    control: form.control,
    name: "client",
  });
  const selectedContractId = useWatch({
    control: form.control,
    name: "contract",
  });
  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: `${client.full_name} · ${client.phone}`,
        description: client.email || client.cin || client.driving_license || client.passport || undefined,
      })),
    [clients],
  );
  const contractOptions = useMemo(
    () =>
      contracts.map((contract) => ({
        value: contract.id,
        label: contract.contract_number,
        description: `${contract.start_date} · ${contract.status}`,
      })),
    [contracts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create invoice"
        description="Manual invoices still use backend totals, so the live subtotal here is only a preview."
        actions={
          <Link to="/invoices">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <FormSection title="Invoice header" description="Client and contract remain optional for some invoice types, but contract-linked invoices should usually include both.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Client" error={form.formState.errors.client?.message}>
            <SearchableSelect
              inputId="invoice-client"
              value={clientOptions.find((option) => option.value === selectedClientId) ?? null}
              options={clientOptions}
              onChange={(option) => form.setValue("client", option?.value ?? "", { shouldValidate: true })}
              placeholder="No client"
              isLoading={clientsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label="Contract" error={form.formState.errors.contract?.message}>
            <SearchableSelect
              inputId="invoice-contract"
              value={contractOptions.find((option) => option.value === selectedContractId) ?? null}
              options={contractOptions}
              onChange={(option) => form.setValue("contract", option?.value ?? "", { shouldValidate: true })}
              placeholder="No contract"
              isLoading={contractsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label="Type" error={form.formState.errors.type?.message}>
            <Select {...form.register("type")}>
              {invoiceTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Issue date" error={form.formState.errors.issue_date?.message}>
            <Input type="date" {...form.register("issue_date")} />
          </FormField>
          <FormField label="Due date" error={form.formState.errors.due_date?.message}>
            <Input type="date" {...form.register("due_date")} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Notes" error={form.formState.errors.notes?.message}>
              <Textarea {...form.register("notes")} />
            </FormField>
          </div>

          <div className="md:col-span-2 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">Invoice items</p>
                <p className="text-sm text-slate-500">Totals are recalculated again by the backend on save.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => itemsArray.append({ description: "", quantity: 1, unit_price: 0 })}
              >
                Add item
              </Button>
            </div>

            {itemsArray.fields.map((field, index) => {
              const rowTotal = Number(watchedItems[index]?.quantity || 0) * Number(watchedItems[index]?.unit_price || 0);
              return (
                <div key={field.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1.6fr_0.8fr_0.8fr_auto]">
                  <FormField label="Description" error={form.formState.errors.items?.[index]?.description?.message}>
                    <Input {...form.register(`items.${index}.description`)} />
                  </FormField>
                  <FormField label="Quantity" error={form.formState.errors.items?.[index]?.quantity?.message}>
                    <Input type="number" min="0" step="0.01" {...form.register(`items.${index}.quantity`)} />
                  </FormField>
                  <FormField label="Unit price" error={form.formState.errors.items?.[index]?.unit_price?.message}>
                    <Input type="number" min="0" step="0.01" {...form.register(`items.${index}.unit_price`)} />
                  </FormField>
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-sm text-slate-500">
                      <p>Total</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        <MoneyDisplay amount={rowTotal} />
                      </p>
                    </div>
                    {itemsArray.fields.length > 1 ? (
                      <Button type="button" variant="danger" onClick={() => itemsArray.remove(index)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
              <p className="text-sm text-slate-300">Live subtotal</p>
              <p className="mt-1 text-2xl font-semibold">
                <MoneyDisplay amount={liveSubtotal} />
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create invoice"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
