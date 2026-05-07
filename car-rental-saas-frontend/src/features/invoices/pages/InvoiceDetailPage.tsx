import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { PDFDownloadButton } from "@/components/common/PDFDownloadButton";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  cancelInvoice,
  downloadInvoicePdf,
  financeKeys,
  getInvoice,
  getInvoicePayments,
  issueInvoice,
  payInvoice,
} from "@/features/invoices/api";
import { paymentMethods } from "@/lib/constants";
import { formatDate, formatDateTime, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

const invoicePaymentSchema = z.object({
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  method: z.string().min(1, "Payment method is required."),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type InvoicePaymentFormValues = z.infer<typeof invoicePaymentSchema>;

export default function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const payForm = useForm<InvoicePaymentFormValues>({
    resolver: zodResolver(invoicePaymentSchema) as never,
    defaultValues: {
      amount: 0,
      method: "CASH",
      reference: "",
      notes: "",
    },
  });

  const invoiceQuery = useQuery({
    queryKey: financeKeys.invoiceDetail(id),
    queryFn: () => getInvoice(id),
    enabled: Boolean(id),
  });

  const paymentsQuery = useQuery({
    queryKey: ["invoice-payments", id],
    queryFn: () => getInvoicePayments(id),
    enabled: Boolean(id),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.invoiceDetail(id) });
    await queryClient.invalidateQueries({ queryKey: financeKeys.invoices });
    await queryClient.invalidateQueries({ queryKey: ["invoice-payments", id] });
  };

  useEffect(() => {
    if (invoiceQuery.data) {
      payForm.reset({
        amount: Number(invoiceQuery.data.remaining_amount || 0),
        method: "CASH",
        reference: "",
        notes: "",
      });
    }
  }, [invoiceQuery.data, payForm]);

  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: async () => {
      toast.success("Invoice issued.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to issue invoice", { description: getErrorMessage(error) }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: async () => {
      toast.success("Invoice cancelled.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to cancel invoice", { description: getErrorMessage(error) }),
  });

  const payMutation = useMutation({
    mutationFn: (values: InvoicePaymentFormValues) => payInvoice(id, values),
    onSuccess: async () => {
      toast.success("Invoice payment recorded.");
      setPayOpen(false);
      payForm.reset({
        amount: Number(invoiceQuery.data?.remaining_amount || 0),
        method: "CASH",
        reference: "",
        notes: "",
      });
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, payForm.setError);
      toast.error("Unable to pay invoice", { description: getErrorMessage(error) });
    },
  });

  if (invoiceQuery.isPending) {
    return <LoadingState title="Loading invoice..." />;
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return <ErrorState description="This invoice could not be loaded." />;
  }

  const invoice = invoiceQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description="Invoice totals, payment history, and balance posture."
        actions={
          <>
            <Link to="/invoices">
              <Button variant="outline">Back to list</Button>
            </Link>
            {invoice.status === "DRAFT" ? (
              <Button variant="success" onClick={() => issueMutation.mutate(invoice.id)}>
                Issue
              </Button>
            ) : null}
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" ? (
              <Button onClick={() => setPayOpen(true)}>Pay invoice</Button>
            ) : null}
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
              <Button variant="danger" onClick={() => cancelMutation.mutate(invoice.id)}>
                Cancel
              </Button>
            ) : null}
            <PDFDownloadButton onDownload={() => downloadInvoicePdf(id)} successMessage="Invoice PDF downloaded." />
          </>
        }
      />

      <DetailPanel
        title="Invoice summary"
        description="Invoice totals are calculated from invoice items by the backend."
        items={[
          { label: "Status", value: <BadgeStatus status={invoice.status} /> },
          { label: "Type", value: formatEnumLabel(invoice.type) },
          { label: "Issue date", value: formatDate(invoice.issue_date) },
          { label: "Due date", value: formatDate(invoice.due_date) },
          { label: "Subtotal", value: <MoneyDisplay amount={invoice.subtotal} /> },
          { label: "Discount", value: <MoneyDisplay amount={invoice.discount_amount} /> },
          { label: "Tax", value: <MoneyDisplay amount={invoice.tax_amount} /> },
          { label: "Total amount", value: <MoneyDisplay amount={invoice.total_amount} /> },
          { label: "Paid amount", value: <MoneyDisplay amount={invoice.paid_amount} /> },
          { label: "Remaining amount", value: <MoneyDisplay amount={invoice.remaining_amount} /> },
        ]}
      />

      <DataTable
        columns={[
          { key: "description", header: "Description", render: (item) => item.description },
          { key: "quantity", header: "Quantity", render: (item) => item.quantity },
          { key: "unit_price", header: "Unit price", render: (item) => <MoneyDisplay amount={item.unit_price} /> },
          { key: "total_price", header: "Total", render: (item) => <MoneyDisplay amount={item.total_price} /> },
        ]}
        rows={invoice.items}
        emptyTitle="No items"
        emptyDescription="Invoice items will appear here."
      />

      <DataTable
        columns={[
          { key: "paid_at", header: "Paid at", render: (payment) => formatDateTime(payment.paid_at) },
          { key: "amount", header: "Amount", render: (payment) => <MoneyDisplay amount={payment.amount} /> },
          { key: "method", header: "Method", render: (payment) => getPaymentMethodLabel(payment.method) },
          { key: "type", header: "Type", render: (payment) => formatEnumLabel(payment.type) },
          { key: "status", header: "Status", render: (payment) => <BadgeStatus status={payment.status} /> },
        ]}
        rows={paymentsQuery.data ?? []}
        loading={paymentsQuery.isPending}
        error={paymentsQuery.isError ? "Unable to load payment history." : null}
        emptyTitle="No payments recorded"
        emptyDescription="Payments linked to this invoice will appear here."
      />

      <Modal
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          payForm.reset({
            amount: Number(invoice.remaining_amount || 0),
            method: "CASH",
            reference: "",
            notes: "",
          });
        }}
        title="Pay invoice"
        description="Payments update invoice paid and remaining amounts automatically."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPayOpen(false);
                payForm.reset({
                  amount: Number(invoice.remaining_amount || 0),
                  method: "CASH",
                  reference: "",
                  notes: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button form="invoice-pay-form" type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending ? "Processing..." : "Record payment"}
            </Button>
          </>
        }
      >
        <form id="invoice-pay-form" className="grid gap-4 md:grid-cols-2" onSubmit={payForm.handleSubmit((values) => payMutation.mutate(values))}>
          <FormField label="Amount" error={payForm.formState.errors.amount?.message}>
            <Input id="pay-amount" type="number" min="0" step="0.01" {...payForm.register("amount")} />
          </FormField>
          <FormField label="Method" error={payForm.formState.errors.method?.message}>
            <Select id="pay-method" {...payForm.register("method")}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Reference" error={payForm.formState.errors.reference?.message}>
            <Input id="pay-reference" {...payForm.register("reference")} />
          </FormField>
          <FormField label="Notes" error={payForm.formState.errors.notes?.message} className="md:col-span-2">
            <Input id="pay-notes" {...payForm.register("notes")} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
