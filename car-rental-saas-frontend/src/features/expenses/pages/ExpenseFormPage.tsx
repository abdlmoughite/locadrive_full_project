import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { FormSection } from "@/components/forms/FormSection";
import { expenseSchema } from "@/components/forms/schemas";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createExpense, expensesKeys, getExpense, updateExpense } from "@/features/expenses/api";
import { useCarLookup, useContractLookup } from "@/hooks/useLookups";
import { expenseCategories, paymentMethods } from "@/lib/constants";
import { getErrorMessage } from "@/lib/apiClient";
import { formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpenseFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const carsQuery = useCarLookup();
  const contractsQuery = useContractLookup();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const expenseQuery = useQuery({
    queryKey: expensesKeys.detail(id),
    queryFn: () => getExpense(id),
    enabled: mode === "edit" && Boolean(id),
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      category: "OTHER",
      title: "",
      description: "",
      amount: 0,
      payment_method: "CASH",
      supplier_name: "",
      expense_date: new Date().toISOString().slice(0, 10),
      car: "",
      contract: "",
    },
  });

  useEffect(() => {
    if (expenseQuery.data) {
      form.reset({
        category: expenseQuery.data.category,
        title: expenseQuery.data.title,
        description: expenseQuery.data.description,
        amount: Number(expenseQuery.data.amount),
        payment_method: expenseQuery.data.payment_method,
        supplier_name: expenseQuery.data.supplier_name,
        expense_date: expenseQuery.data.expense_date,
        car: expenseQuery.data.car ?? "",
        contract: expenseQuery.data.contract ?? "",
      });
    }
  }, [expenseQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => {
      const payload = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          payload.append(key, String(value));
        }
      });
      if (invoiceFile) {
        payload.append("invoice_file", invoiceFile);
      }

      if (mode === "create") {
        return createExpense(payload);
      }

      return updateExpense(id, payload);
    },
    onSuccess: async (expense) => {
      toast.success(mode === "create" ? "Expense created successfully." : "Expense updated successfully.");
      await queryClient.invalidateQueries({ queryKey: expensesKeys.all });
      navigate(`/expenses/${expense.id}`, { replace: true });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to save expense", { description: getErrorMessage(error) });
    },
  });

  const cars = useMemo(() => carsQuery.data?.results ?? [], [carsQuery.data]);
  const contracts = useMemo(() => contractsQuery.data?.results ?? [], [contractsQuery.data]);
  const [carValue, contractValue] = useWatch({
    control: form.control,
    name: ["car", "contract"],
  });
  const carOptions = useMemo(
    () =>
      cars.map((car) => ({
        value: car.id,
        label: `${car.plate_number} · ${car.brand} ${car.model}`,
        description: `${car.status} · ${car.daily_price}`,
      })),
    [cars],
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
        title={mode === "create" ? "Create expense" : "Edit expense"}
        description="Expenses reduce profit and should be captured with category and payment method."
        actions={
          <Link to={mode === "create" ? "/expenses" : `/expenses/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      <FormSection title="Expense details" description="The backend prevents amount and payment method changes after creation.">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Category" error={form.formState.errors.category?.message}>
            <Select {...form.register("category")}>
              {expenseCategories.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register("title")} />
          </FormField>
          <FormField label="Amount" error={form.formState.errors.amount?.message}>
            <Input type="number" min="0" step="0.01" {...form.register("amount")} />
          </FormField>
          <FormField label="Payment method" error={form.formState.errors.payment_method?.message}>
            <Select {...form.register("payment_method")}>
              {paymentMethods.map((option) => (
                <option key={option} value={option}>
                  {getPaymentMethodLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Supplier name" error={form.formState.errors.supplier_name?.message}>
            <Input {...form.register("supplier_name")} />
          </FormField>
          <FormField label="Expense date" error={form.formState.errors.expense_date?.message}>
            <Input type="date" {...form.register("expense_date")} />
          </FormField>
          <FormField label="Car" error={form.formState.errors.car?.message}>
            <SearchableSelect
              inputId="expense-car"
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
              inputId="expense-contract"
              value={contractOptions.find((option) => option.value === contractValue) ?? null}
              options={contractOptions}
              onChange={(option) => form.setValue("contract", option?.value ?? "", { shouldValidate: true })}
              placeholder="No contract"
              isLoading={contractsQuery.isPending}
              isClearable
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description" error={form.formState.errors.description?.message}>
              <Textarea {...form.register("description")} />
            </FormField>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="invoice-file">
              Invoice file
            </label>
            <Input id="invoice-file" type="file" onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : mode === "create" ? "Create expense" : "Save changes"}
            </Button>
          </div>
        </form>
      </FormSection>
    </div>
  );
}
