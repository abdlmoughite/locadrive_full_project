import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { depositRefundSchema, depositUseSchema } from "@/components/forms/schemas";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { getCar } from "@/features/cars/api";
import { getClient } from "@/features/clients/api";
import { getContract } from "@/features/contracts/api";
import { depositsKeys, getDeposit, refundDeposit, useDeposit as applyDepositUsage } from "@/features/deposits/api";
import { invoiceTypes } from "@/lib/constants";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";

type DepositRefundFormValues = z.infer<typeof depositRefundSchema>;
type DepositUseFormValues = z.infer<typeof depositUseSchema>;

export default function DepositDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [refundOpen, setRefundOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const refundForm = useForm<DepositRefundFormValues>({
    resolver: zodResolver(depositRefundSchema) as never,
    defaultValues: {
      amount: 0,
      notes: "",
      held_amount: 0,
    },
  });
  const useFormState = useForm<DepositUseFormValues>({
    resolver: zodResolver(depositUseSchema) as never,
    defaultValues: {
      amount: 0,
      reason: "",
      invoice_type: "DAMAGE_INVOICE",
      held_amount: 0,
    },
  });

  const depositQuery = useQuery({
    queryKey: depositsKeys.detail(id),
    queryFn: () => getDeposit(id),
    enabled: Boolean(id),
  });

  const clientQuery = useQuery({
    queryKey: ["deposit-client", depositQuery.data?.client],
    queryFn: () => getClient(depositQuery.data!.client),
    enabled: Boolean(depositQuery.data?.client),
  });

  const contractQuery = useQuery({
    queryKey: ["deposit-contract", depositQuery.data?.contract],
    queryFn: () => getContract(depositQuery.data!.contract),
    enabled: Boolean(depositQuery.data?.contract),
  });

  const carQuery = useQuery({
    queryKey: ["deposit-car", depositQuery.data?.car],
    queryFn: () => getCar(depositQuery.data!.car),
    enabled: Boolean(depositQuery.data?.car),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: depositsKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: depositsKeys.all });
  };

  useEffect(() => {
    if (!depositQuery.data) {
      return;
    }

    const heldAmount = Number(depositQuery.data.held_amount || 0);
    refundForm.reset({
      amount: 0,
      notes: "",
      held_amount: heldAmount,
    });
    useFormState.reset({
      amount: 0,
      reason: "",
      invoice_type: "DAMAGE_INVOICE",
      held_amount: heldAmount,
    });
  }, [depositQuery.data, refundForm, useFormState]);

  const refundMutation = useMutation({
    mutationFn: (values: DepositRefundFormValues) => {
      return refundDeposit(id, {
        amount: values.amount,
        notes: values.notes,
      });
    },
    onSuccess: async () => {
      toast.success("Deposit refunded successfully.");
      setRefundOpen(false);
      refundForm.reset({
        amount: 0,
        notes: "",
        held_amount: Number(depositQuery.data?.held_amount || 0),
      });
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, refundForm.setError);
      toast.error("Unable to refund deposit", { description: getErrorMessage(error) });
    },
  });

  const useMutationAction = useMutation({
    mutationFn: (values: DepositUseFormValues) => {
      return applyDepositUsage(id, {
        amount: values.amount,
        reason: values.reason,
        invoice_type: values.invoice_type,
      });
    },
    onSuccess: async () => {
      toast.success("Deposit applied successfully.");
      setUseOpen(false);
      useFormState.reset({
        amount: 0,
        reason: "",
        invoice_type: "DAMAGE_INVOICE",
        held_amount: Number(depositQuery.data?.held_amount || 0),
      });
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, useFormState.setError);
      toast.error("Unable to apply deposit", { description: getErrorMessage(error) });
    },
  });

  if (depositQuery.isPending) {
    return <LoadingState title="Loading deposit..." />;
  }

  if (depositQuery.isError || !depositQuery.data) {
    return <ErrorState description="This deposit could not be loaded." />;
  }

  const deposit = depositQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposit detail"
        description="Held, used, and refunded amounts are tracked separately from rental revenue."
        actions={
          <>
            <Link to="/deposits">
              <Button variant="outline">Back to list</Button>
            </Link>
            <Button variant="outline" onClick={() => setRefundOpen(true)}>
              Refund deposit
            </Button>
            <Button onClick={() => setUseOpen(true)}>Use deposit</Button>
          </>
        }
      />

      <DetailPanel
        title="Deposit profile"
        description="The backend prevents refunds or use beyond the currently held amount."
        items={[
          { label: "Status", value: <BadgeStatus status={deposit.status} /> },
          { label: "Client", value: clientQuery.data?.full_name ?? deposit.client },
          { label: "Contract", value: contractQuery.data?.contract_number ?? deposit.contract },
          { label: "Car", value: carQuery.data?.plate_number ?? deposit.car },
          { label: "Amount", value: <MoneyDisplay amount={deposit.amount} /> },
          { label: "Held amount", value: <MoneyDisplay amount={deposit.held_amount} /> },
          { label: "Used amount", value: <MoneyDisplay amount={deposit.used_amount} /> },
          { label: "Refunded amount", value: <MoneyDisplay amount={deposit.refunded_amount} /> },
          { label: "Held at", value: formatDateTime(deposit.held_at) },
          { label: "Refunded at", value: formatDateTime(deposit.refunded_at) },
        ]}
      />

      <Modal
        open={refundOpen}
        onClose={() => {
          setRefundOpen(false);
          refundForm.reset({
            amount: 0,
            notes: "",
            held_amount: Number(deposit.held_amount || 0),
          });
        }}
        title="Refund deposit"
        description="The backend validates that refund amount does not exceed the held amount."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setRefundOpen(false);
                refundForm.reset({
                  amount: 0,
                  notes: "",
                  held_amount: Number(deposit.held_amount || 0),
                });
              }}
            >
              Cancel
            </Button>
            <Button form="refund-deposit-form" type="submit" disabled={refundMutation.isPending}>
              {refundMutation.isPending ? "Refunding..." : "Refund"}
            </Button>
          </>
        }
      >
        <form id="refund-deposit-form" className="grid gap-4" onSubmit={refundForm.handleSubmit((values) => refundMutation.mutate(values))}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Currently held: <MoneyDisplay amount={deposit.held_amount} />
          </div>
          <FormField label="Amount" error={refundForm.formState.errors.amount?.message}>
            <Input id="refund-amount" type="number" min="0" step="0.01" {...refundForm.register("amount")} />
          </FormField>
          <FormField label="Notes" error={refundForm.formState.errors.notes?.message}>
            <Input id="refund-notes" {...refundForm.register("notes")} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={useOpen}
        onClose={() => {
          setUseOpen(false);
          useFormState.reset({
            amount: 0,
            reason: "",
            invoice_type: "DAMAGE_INVOICE",
            held_amount: Number(deposit.held_amount || 0),
          });
        }}
        title="Use deposit"
        description="Using held deposit creates the proper settlement records on the backend."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setUseOpen(false);
                useFormState.reset({
                  amount: 0,
                  reason: "",
                  invoice_type: "DAMAGE_INVOICE",
                  held_amount: Number(deposit.held_amount || 0),
                });
              }}
            >
              Cancel
            </Button>
            <Button form="use-deposit-form" type="submit" disabled={useMutationAction.isPending}>
              {useMutationAction.isPending ? "Applying..." : "Use deposit"}
            </Button>
          </>
        }
      >
        <form id="use-deposit-form" className="grid gap-4" onSubmit={useFormState.handleSubmit((values) => useMutationAction.mutate(values))}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Currently held: <MoneyDisplay amount={deposit.held_amount} />
          </div>
          <FormField label="Amount" error={useFormState.formState.errors.amount?.message}>
            <Input id="use-amount" type="number" min="0" step="0.01" {...useFormState.register("amount")} />
          </FormField>
          <FormField label="Reason" error={useFormState.formState.errors.reason?.message}>
            <Input id="use-reason" {...useFormState.register("reason")} />
          </FormField>
          <FormField label="Settlement type" error={useFormState.formState.errors.invoice_type?.message}>
            <Select id="use-invoice-type" {...useFormState.register("invoice_type")}>
              {invoiceTypes
                .filter((type) => type === "DAMAGE_INVOICE" || type === "LATE_FEE_INVOICE" || type === "FUEL_FEE_INVOICE")
                .map((type) => (
                  <option key={type} value={type}>
                    {formatEnumLabel(type)}
                  </option>
                ))}
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
