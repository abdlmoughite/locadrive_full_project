import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { contractCompletionSchema, depositSchema, paymentSchema } from "@/components/forms/schemas";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { PDFDownloadButton } from "@/components/common/PDFDownloadButton";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { getCar } from "@/features/cars/api";
import { getClient } from "@/features/clients/api";
import {
  activateContract,
  cancelContract,
  completeContract,
  downloadContractPdf,
  contractsKeys,
  getContract,
  getContractFinancialSummary,
} from "@/features/contracts/api";
import { createContractDeposit, depositsKeys } from "@/features/deposits/api";
import { getDeposits } from "@/features/deposits/api";
import { getInvoices } from "@/features/invoices/api";
import { getIncidents } from "@/features/incidents/api";
import { createPayment } from "@/features/payments/api";
import { getPayments, paymentsKeys } from "@/features/payments/api";
import { paymentMethods, paymentTypes } from "@/lib/constants";
import { formatDate, formatDateTime, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";
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

type ContractCompletionFormValues = z.infer<typeof contractCompletionSchema>;
type ContractDepositFormValues = z.infer<typeof depositSchema>;
type ContractPaymentFormValues = z.infer<typeof paymentSchema>;

export default function ContractDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const completeForm = useForm<ContractCompletionFormValues>({
    resolver: zodResolver(contractCompletionSchema) as never,
    defaultValues: {
      actual_return_date: "",
      return_mileage: 0,
      return_fuel_level: 100,
      late_fee: 0,
      damage_fee: 0,
      fuel_fee: 0,
      maintenance_required: false,
    },
  });
  const depositForm = useForm<ContractDepositFormValues>({
    resolver: zodResolver(depositSchema) as never,
    defaultValues: {
      amount: 0,
      payment_method: "CASH",
      notes: "",
    },
  });
  const paymentForm = useForm<ContractPaymentFormValues>({
    resolver: zodResolver(paymentSchema) as never,
    defaultValues: {
      client: "",
      contract: id,
      invoice: "",
      amount: 0,
      method: "CASH",
      type: "RENTAL_PAYMENT",
      direction: "INCOME",
      reference: "",
      notes: "",
    },
  });
  const selectedPaymentType = useWatch({
    control: paymentForm.control,
    name: "type",
  }) || "RENTAL_PAYMENT";
  const maintenanceRequired = useWatch({
    control: completeForm.control,
    name: "maintenance_required",
  }) ?? false;

  const contractQuery = useQuery({
    queryKey: contractsKeys.detail(id),
    queryFn: () => getContract(id),
    enabled: Boolean(id),
  });

  const summaryQuery = useQuery({
    queryKey: contractsKeys.summary(id),
    queryFn: () => getContractFinancialSummary(id),
    enabled: Boolean(id),
  });

  const clientQuery = useQuery({
    queryKey: ["contract-client", contractQuery.data?.client],
    queryFn: () => getClient(contractQuery.data!.client),
    enabled: Boolean(contractQuery.data?.client),
  });

  const carQuery = useQuery({
    queryKey: ["contract-car", contractQuery.data?.car],
    queryFn: () => getCar(contractQuery.data!.car),
    enabled: Boolean(contractQuery.data?.car),
  });

  const [invoicesQuery, paymentsQuery, depositsQuery, incidentsQuery] = useQueries({
    queries: [
      {
        queryKey: ["contract-invoices", id],
        queryFn: () => getInvoices({ contract: id, page_size: 100, ordering: "-issue_date" }),
        enabled: Boolean(id),
      },
      {
        queryKey: paymentsKeys.list({ contract: id, page_size: 100, ordering: "-paid_at" }),
        queryFn: () => getPayments({ contract: id, page_size: 100, ordering: "-paid_at" }),
        enabled: Boolean(id),
      },
      {
        queryKey: depositsKeys.list({ contract: id, page_size: 100, ordering: "-held_at" }),
        queryFn: () => getDeposits({ contract: id, page_size: 100, ordering: "-held_at" }),
        enabled: Boolean(id),
      },
      {
        queryKey: ["contract-incidents", id],
        queryFn: () => getIncidents({ contract: id, page_size: 100, ordering: "-created_at" }),
        enabled: Boolean(id),
      },
    ],
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: contractsKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: contractsKeys.summary(id) });
    await queryClient.invalidateQueries({ queryKey: contractsKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["contract-invoices", id] });
    await queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
    await queryClient.invalidateQueries({ queryKey: depositsKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["contract-incidents", id] });
  };

  useEffect(() => {
    paymentForm.setValue("direction", directionByType[selectedPaymentType] ?? "INCOME");
  }, [paymentForm, selectedPaymentType]);

  useEffect(() => {
    if (!contractQuery.data) {
      return;
    }

    paymentForm.reset({
      client: contractQuery.data.client,
      contract: id,
      invoice: "",
      amount: 0,
      method: "CASH",
      type: "RENTAL_PAYMENT",
      direction: "INCOME",
      reference: "",
      notes: "",
    });
  }, [contractQuery.data, id, paymentForm]);

  const activateMutation = useMutation({
    mutationFn: activateContract,
    onSuccess: async () => {
      toast.success("Contract activated.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to activate contract", { description: getErrorMessage(error) }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelContract,
    onSuccess: async () => {
      toast.success("Contract cancelled.");
      await refresh();
    },
    onError: (error) => toast.error("Unable to cancel contract", { description: getErrorMessage(error) }),
  });

  const completeMutation = useMutation({
    mutationFn: (values: ContractCompletionFormValues) => completeContract(id, values),
    onSuccess: async () => {
      toast.success("Contract completed successfully.");
      setCompleteOpen(false);
      completeForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, completeForm.setError);
      toast.error("Unable to complete contract", { description: getErrorMessage(error) });
    },
  });

  const depositMutation = useMutation({
    mutationFn: (values: ContractDepositFormValues) => createContractDeposit(id, values),
    onSuccess: async () => {
      toast.success("Deposit received successfully.");
      setDepositOpen(false);
      depositForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, depositForm.setError);
      toast.error("Unable to create deposit", { description: getErrorMessage(error) });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (values: ContractPaymentFormValues) => createPayment(values),
    onSuccess: async () => {
      toast.success("Payment recorded successfully.");
      setPaymentOpen(false);
      paymentForm.reset({
        client: contractQuery.data?.client ?? "",
        contract: id,
        invoice: "",
        amount: 0,
        method: "CASH",
        type: "RENTAL_PAYMENT",
        direction: "INCOME",
        reference: "",
        notes: "",
      });
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, paymentForm.setError);
      toast.error("Unable to record payment", { description: getErrorMessage(error) });
    },
  });

  if (contractQuery.isPending) {
    return <LoadingState title="Loading contract..." />;
  }

  if (contractQuery.isError || !contractQuery.data) {
    return <ErrorState description="This contract could not be loaded." />;
  }

  const contract = contractQuery.data;
  const heldDeposit = (depositsQuery.data?.results ?? []).reduce((sum, deposit) => sum + Number(deposit.held_amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.contract_number}
        description="Contract lifecycle, invoice posture, payments, held deposits, and incidents in one place."
        actions={
          <>
            <Link to="/contracts">
              <Button variant="outline">Back to list</Button>
            </Link>
            {contract.status === "DRAFT" ? (
              <Button variant="success" onClick={() => activateMutation.mutate(contract.id)}>
                Activate
              </Button>
            ) : null}
            {contract.status === "ACTIVE" || contract.status === "OVERDUE" ? (
              <Button onClick={() => setCompleteOpen(true)}>Complete</Button>
            ) : null}
            {contract.status !== "COMPLETED" && contract.status !== "CANCELLED" ? (
              <Button variant="danger" onClick={() => cancelMutation.mutate(contract.id)}>
                Cancel
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDepositOpen(true)}>
              Create deposit
            </Button>
            <Button variant="outline" onClick={() => setPaymentOpen(true)}>
              Add payment
            </Button>
            <PDFDownloadButton onDownload={() => downloadContractPdf(id)} successMessage="Contract PDF downloaded." />
          </>
        }
      />

      <DetailPanel
        title="Contract profile"
        description="Contract totals are calculated by the backend, and active contracts update the linked car automatically."
        items={[
          { label: "Status", value: <BadgeStatus status={contract.status} /> },
          { label: "Client", value: clientQuery.data?.full_name ?? contract.client },
          {
            label: "Car",
            value: carQuery.data ? `${carQuery.data.plate_number} · ${carQuery.data.brand} ${carQuery.data.model}` : contract.car,
          },
          { label: "Start date", value: formatDate(contract.start_date) },
          { label: "Expected return", value: formatDate(contract.expected_return_date) },
          { label: "Actual return", value: formatDate(contract.actual_return_date) },
          { label: "Days count", value: contract.days_count },
          { label: "Daily price", value: <MoneyDisplay amount={contract.daily_price} /> },
          { label: "Subtotal", value: <MoneyDisplay amount={contract.subtotal} /> },
          { label: "Extra fees", value: <MoneyDisplay amount={contract.extra_fees} /> },
          { label: "Discount", value: <MoneyDisplay amount={contract.discount_amount} /> },
          { label: "Total amount", value: <MoneyDisplay amount={contract.total_amount} /> },
          { label: "Remaining amount", value: <MoneyDisplay amount={contract.remaining_amount} /> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summaryQuery.data?.total_invoiced} className="text-2xl font-semibold text-slate-950" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total paid</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summaryQuery.data?.total_paid} className="text-2xl font-semibold text-emerald-700" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total due</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summaryQuery.data?.total_due} className="text-2xl font-semibold text-amber-700" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deposits held</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={heldDeposit} className="text-2xl font-semibold text-blue-700" />
            <p className="mt-2 text-sm text-slate-500">Held deposits are tracked separately from revenue and profit.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "invoice_number", header: "Invoice", render: (invoice) => invoice.invoice_number },
                { key: "issue_date", header: "Issue date", render: (invoice) => formatDate(invoice.issue_date) },
                { key: "status", header: "Status", render: (invoice) => <BadgeStatus status={invoice.status} /> },
                { key: "total_amount", header: "Total", render: (invoice) => <MoneyDisplay amount={invoice.total_amount} /> },
                { key: "remaining_amount", header: "Remaining", render: (invoice) => <MoneyDisplay amount={invoice.remaining_amount} /> },
              ]}
              rows={invoicesQuery.data?.results ?? []}
              loading={invoicesQuery.isPending}
              error={invoicesQuery.isError ? "Unable to load invoices." : null}
              emptyTitle="No invoices"
              emptyDescription="Contract-generated invoices will appear here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "paid_at", header: "Paid at", render: (payment) => formatDateTime(payment.paid_at) },
                { key: "amount", header: "Amount", render: (payment) => <MoneyDisplay amount={payment.amount} /> },
                { key: "type", header: "Type", render: (payment) => formatEnumLabel(payment.type) },
                { key: "method", header: "Method", render: (payment) => getPaymentMethodLabel(payment.method) },
                { key: "status", header: "Status", render: (payment) => <BadgeStatus status={payment.status} /> },
              ]}
              rows={paymentsQuery.data?.results ?? []}
              loading={paymentsQuery.isPending}
              error={paymentsQuery.isError ? "Unable to load payments." : null}
              emptyTitle="No payments"
              emptyDescription="Payments recorded for this contract will appear here."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deposits / Daman</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "held_at", header: "Held at", render: (deposit) => formatDateTime(deposit.held_at) },
                { key: "amount", header: "Amount", render: (deposit) => <MoneyDisplay amount={deposit.amount} /> },
                { key: "held_amount", header: "Held", render: (deposit) => <MoneyDisplay amount={deposit.held_amount} /> },
                { key: "used_amount", header: "Used", render: (deposit) => <MoneyDisplay amount={deposit.used_amount} /> },
                { key: "status", header: "Status", render: (deposit) => <BadgeStatus status={deposit.status} /> },
              ]}
              rows={depositsQuery.data?.results ?? []}
              loading={depositsQuery.isPending}
              error={depositsQuery.isError ? "Unable to load deposits." : null}
              emptyTitle="No deposits"
              emptyDescription="Security deposit records will appear here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: "type", header: "Type", render: (incident) => formatEnumLabel(incident.type) },
                { key: "created_at", header: "Created", render: (incident) => formatDateTime(incident.created_at) },
                { key: "amount", header: "Amount", render: (incident) => <MoneyDisplay amount={incident.amount} /> },
                { key: "status", header: "Status", render: (incident) => <BadgeStatus status={incident.status} /> },
              ]}
              rows={incidentsQuery.data?.results ?? []}
              loading={incidentsQuery.isPending}
              error={incidentsQuery.isError ? "Unable to load incidents." : null}
              emptyTitle="No incidents"
              emptyDescription="Damage, fines, and other incidents linked to this contract will appear here."
            />
          </CardContent>
        </Card>
      </div>

      <Modal
        open={completeOpen}
        onClose={() => {
          setCompleteOpen(false);
          completeForm.reset();
        }}
        title="Complete contract"
        description="Return details and additional fees are applied atomically by the backend."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCompleteOpen(false);
                completeForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button form="complete-contract-form" type="submit" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? "Completing..." : "Complete contract"}
            </Button>
          </>
        }
      >
        <form id="complete-contract-form" className="grid gap-4 md:grid-cols-2" onSubmit={completeForm.handleSubmit((values) => completeMutation.mutate(values))}>
          <FormField label="Actual return date" error={completeForm.formState.errors.actual_return_date?.message}>
            <Input id="actual-return-date" type="date" {...completeForm.register("actual_return_date")} />
          </FormField>
          <FormField label="Return mileage" error={completeForm.formState.errors.return_mileage?.message}>
            <Input id="return-mileage" type="number" min="0" {...completeForm.register("return_mileage")} />
          </FormField>
          <FormField label="Return fuel level" error={completeForm.formState.errors.return_fuel_level?.message}>
            <Input id="return-fuel-level" type="number" min="0" max="100" step="0.01" {...completeForm.register("return_fuel_level")} />
          </FormField>
          <FormField label="Late fee" error={completeForm.formState.errors.late_fee?.message}>
            <Input id="late-fee" type="number" min="0" step="0.01" {...completeForm.register("late_fee")} />
          </FormField>
          <FormField label="Damage fee" error={completeForm.formState.errors.damage_fee?.message}>
            <Input id="damage-fee" type="number" min="0" step="0.01" {...completeForm.register("damage_fee")} />
          </FormField>
          <FormField label="Fuel fee" error={completeForm.formState.errors.fuel_fee?.message}>
            <Input id="fuel-fee" type="number" min="0" step="0.01" {...completeForm.register("fuel_fee")} />
          </FormField>
          <div className="md:col-span-2 flex items-center gap-3 pt-4">
            <input
              id="maintenance-required"
              type="checkbox"
              checked={maintenanceRequired}
              onChange={(event) => completeForm.setValue("maintenance_required", event.target.checked)}
            />
            <label className="text-sm font-medium text-slate-700" htmlFor="maintenance-required">
              Maintenance required before the car becomes available again
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={depositOpen}
        onClose={() => {
          setDepositOpen(false);
          depositForm.reset();
        }}
        title="Receive deposit"
        description="Deposits are tracked separately from revenue and profit."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setDepositOpen(false);
                depositForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button form="contract-deposit-form" type="submit" disabled={depositMutation.isPending}>
              {depositMutation.isPending ? "Saving..." : "Receive deposit"}
            </Button>
          </>
        }
      >
        <form id="contract-deposit-form" className="grid gap-4 md:grid-cols-2" onSubmit={depositForm.handleSubmit((values) => depositMutation.mutate(values))}>
          <FormField label="Amount" error={depositForm.formState.errors.amount?.message}>
            <Input id="deposit-amount" type="number" min="0" step="0.01" {...depositForm.register("amount")} />
          </FormField>
          <FormField label="Payment method" error={depositForm.formState.errors.payment_method?.message}>
            <Select id="deposit-method" {...depositForm.register("payment_method")}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Notes" error={depositForm.formState.errors.notes?.message} className="md:col-span-2">
            <Input id="deposit-notes" {...depositForm.register("notes")} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          paymentForm.reset({
            client: contract.client,
            contract: id,
            invoice: "",
            amount: 0,
            method: "CASH",
            type: "RENTAL_PAYMENT",
            direction: "INCOME",
            reference: "",
            notes: "",
          });
        }}
        title="Add payment"
        description="Use this for manual contract-level collections. Invoice-linked payments should preferably be recorded from the invoice page."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentOpen(false);
                paymentForm.reset({
                  client: contract.client,
                  contract: id,
                  invoice: "",
                  amount: 0,
                  method: "CASH",
                  type: "RENTAL_PAYMENT",
                  direction: "INCOME",
                  reference: "",
                  notes: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button form="contract-payment-form" type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? "Saving..." : "Create payment"}
            </Button>
          </>
        }
      >
        <form id="contract-payment-form" className="grid gap-4 md:grid-cols-2" onSubmit={paymentForm.handleSubmit((values) => paymentMutation.mutate(values))}>
          <FormField label="Amount" error={paymentForm.formState.errors.amount?.message}>
            <Input id="payment-amount" type="number" min="0" step="0.01" {...paymentForm.register("amount")} />
          </FormField>
          <FormField label="Payment method" error={paymentForm.formState.errors.method?.message}>
            <Select id="payment-method" {...paymentForm.register("method")}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Payment type" error={paymentForm.formState.errors.type?.message}>
            <Select id="payment-type" {...paymentForm.register("type")}>
              {paymentTypes
                .filter((type) => type !== "DEPOSIT" && type !== "DEPOSIT_REFUND" && type !== "EXPENSE_PAYMENT")
                .map((type) => (
                  <option key={type} value={type}>
                    {formatEnumLabel(type)}
                  </option>
                ))}
            </Select>
          </FormField>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Direction: <span className="font-semibold text-slate-950">{formatEnumLabel(directionByType[selectedPaymentType])}</span>
          </div>
          <FormField label="Reference" error={paymentForm.formState.errors.reference?.message}>
            <Input id="payment-reference" {...paymentForm.register("reference")} />
          </FormField>
          <FormField label="Notes" error={paymentForm.formState.errors.notes?.message} className="md:col-span-2">
            <Input id="payment-notes" {...paymentForm.register("notes")} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
