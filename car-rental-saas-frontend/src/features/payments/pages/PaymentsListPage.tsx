import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { FormField } from "@/components/forms/FormField";
import { paymentSchema } from "@/components/forms/schemas";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { createPayment, getPayments, paymentsKeys } from "@/features/payments/api";
import { useClientLookup, useContractLookup, useInvoiceLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { pageSize, paymentDirections, paymentMethods, paymentStatuses, paymentTypes } from "@/lib/constants";
import { formatDateTime, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

const directionByType: Record<string, "INCOME" | "OUTCOME"> = {
  RENTAL_PAYMENT: "INCOME",
  DEPOSIT: "INCOME",
  DEPOSIT_REFUND: "OUTCOME",
  DAMAGE_PAYMENT: "INCOME",
  LATE_FEE_PAYMENT: "INCOME",
  FUEL_FEE_PAYMENT: "INCOME",
  EXPENSE_PAYMENT: "OUTCOME",
};

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const clientsQuery = useClientLookup();
  const contractsQuery = useContractLookup();
  const invoicesQuery = useInvoiceLookup();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as never,
    defaultValues: {
      client: "",
      contract: "",
      invoice: "",
      amount: 0,
      method: "CASH",
      type: "RENTAL_PAYMENT",
      direction: "INCOME",
      notes: "",
      reference: "",
    },
  });
  const selectedType = useWatch({
    control: form.control,
    name: "type",
  }) || "RENTAL_PAYMENT";

  useEffect(() => {
    form.setValue("direction", directionByType[selectedType] ?? "INCOME");
  }, [form, selectedType]);

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      direction: direction || undefined,
      method: method || undefined,
      paid_at__gte: dateRange.startDate || undefined,
      paid_at__lte: dateRange.endDate || undefined,
      ordering: "-paid_at",
    }),
    [dateRange.endDate, dateRange.startDate, debouncedSearch, direction, method, page, status],
  );

  const paymentsQuery = useQuery({
    queryKey: paymentsKeys.list(params),
    queryFn: () => getPayments(params),
  });

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) => createPayment(values),
    onSuccess: async () => {
      toast.success(t("ui.paymentCreated", { defaultValue: "Payment created successfully." }));
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
    },
    onError: (error) => {
      applyServerValidationErrors(error, form.setError);
      toast.error(t("ui.paymentCreateError", { defaultValue: "Unable to create payment" }), { description: getErrorMessage(error) });
    },
  });

  const clients = useMemo(() => clientsQuery.data?.results ?? [], [clientsQuery.data]);
  const contracts = useMemo(() => contractsQuery.data?.results ?? [], [contractsQuery.data]);
  const invoices = useMemo(() => invoicesQuery.data?.results ?? [], [invoicesQuery.data]);
  const [selectedClientId, selectedContractId, selectedInvoiceId] = useWatch({
    control: form.control,
    name: ["client", "contract", "invoice"],
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
  const invoiceOptions = useMemo(
    () =>
      invoices.map((invoice) => ({
        value: invoice.id,
        label: invoice.invoice_number,
        description: `${invoice.status} · ${invoice.remaining_amount}`,
      })),
    [invoices],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.payments")}
        description={t("ui.paymentsDescription")}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("ui.createPayment")}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px_320px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchPayments")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {paymentStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={direction} onChange={(event) => setDirection(event.target.value)}>
          <option value="">{t("common.allDirections")}</option>
          {paymentDirections.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="">{t("common.allMethods")}</option>
          {paymentMethods.map((option) => (
            <option key={option} value={option}>
              {getPaymentMethodLabel(option)}
            </option>
          ))}
        </Select>
        <DateRangeFilter startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
      </div>

      <DataTable
        columns={[
          { key: "amount", header: t("common.amount"), render: (payment) => <MoneyDisplay amount={payment.amount} /> },
          { key: "method", header: t("common.method"), render: (payment) => getPaymentMethodLabel(payment.method) },
          { key: "type", header: t("common.type"), render: (payment) => formatEnumLabel(payment.type) },
          { key: "direction", header: t("common.direction"), render: (payment) => formatEnumLabel(payment.direction) },
          { key: "status", header: t("common.status"), render: (payment) => <BadgeStatus status={payment.status} /> },
          { key: "paid_at", header: t("common.paidAt"), render: (payment) => formatDateTime(payment.paid_at) },
          {
            key: "client",
            header: t("common.client"),
            render: (payment) => clients.find((client) => client.id === payment.client)?.full_name ?? "-",
          },
          {
            key: "actions",
            header: t("common.actions"),
            render: (payment) => (
              <Link to={`/payments/${payment.id}`}>
                <Button size="sm" variant="outline">
                  {t("common.view")}
                </Button>
              </Link>
            ),
          },
        ]}
        rows={paymentsQuery.data?.results ?? []}
        loading={paymentsQuery.isPending}
        error={paymentsQuery.isError ? t("ui.noPayments") : null}
        emptyTitle={t("ui.noPayments")}
        emptyDescription={t("ui.noPaymentsDescription")}
        page={page}
        pageSize={pageSize}
        total={paymentsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          form.reset();
        }}
        title={t("ui.createPayment")}
        description={t("payments.createDescription", { defaultValue: "Payment direction is inferred from payment type to stay aligned with backend validation." })}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button form="create-payment-form" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("common.creating") : t("ui.createPayment")}
            </Button>
          </>
        }
      >
        <form id="create-payment-form" className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label={t("common.client")} error={form.formState.errors.client?.message}>
            <SearchableSelect
              inputId="payment-client"
              value={clientOptions.find((option) => option.value === selectedClientId) ?? null}
              options={clientOptions}
              onChange={(option) => form.setValue("client", option?.value ?? "", { shouldValidate: true })}
              placeholder={t("common.noClient")}
              isLoading={clientsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label={t("common.contract")} error={form.formState.errors.contract?.message}>
            <SearchableSelect
              inputId="payment-contract"
              value={contractOptions.find((option) => option.value === selectedContractId) ?? null}
              options={contractOptions}
              onChange={(option) => form.setValue("contract", option?.value ?? "", { shouldValidate: true })}
              placeholder={t("common.noContract")}
              isLoading={contractsQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label={t("common.invoice")} error={form.formState.errors.invoice?.message}>
            <SearchableSelect
              inputId="payment-invoice"
              value={invoiceOptions.find((option) => option.value === selectedInvoiceId) ?? null}
              options={invoiceOptions}
              onChange={(option) => form.setValue("invoice", option?.value ?? "", { shouldValidate: true })}
              placeholder={t("common.noInvoice")}
              isLoading={invoicesQuery.isPending}
              isClearable
            />
          </FormField>
          <FormField label={t("common.amount")} error={form.formState.errors.amount?.message}>
            <Input id="payment-amount-create" type="number" min="0" step="0.01" {...form.register("amount")} />
          </FormField>
          <FormField label={t("common.method")} error={form.formState.errors.method?.message}>
            <Select id="payment-method-create" {...form.register("method")}>
              {paymentMethods.map((option) => (
                <option key={option} value={option}>
                  {getPaymentMethodLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("common.type")} error={form.formState.errors.type?.message}>
            <Select id="payment-type-create" {...form.register("type")}>
              {paymentTypes.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {t("common.direction")}: <span className="font-semibold text-slate-950">{formatEnumLabel(directionByType[selectedType])}</span>
          </div>
          <FormField label={t("common.reference", { defaultValue: "Reference" })} error={form.formState.errors.reference?.message}>
            <Input id="payment-reference-create" {...form.register("reference")} />
          </FormField>
          <FormField label={t("common.notes")} error={form.formState.errors.notes?.message} className="md:col-span-2">
            <Input id="payment-notes-create" {...form.register("notes")} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
