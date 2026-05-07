import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { getClient } from "@/features/clients/api";
import { getInvoice } from "@/features/invoices/api";
import { getPayment, paymentsKeys } from "@/features/payments/api";
import { getContract } from "@/features/contracts/api";
import { formatDateTime, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

export default function PaymentDetailPage() {
  const { id = "" } = useParams();

  const paymentQuery = useQuery({
    queryKey: paymentsKeys.detail(id),
    queryFn: () => getPayment(id),
    enabled: Boolean(id),
  });

  const clientQuery = useQuery({
    queryKey: ["payment-client", paymentQuery.data?.client],
    queryFn: () => getClient(paymentQuery.data!.client!),
    enabled: Boolean(paymentQuery.data?.client),
  });

  const contractQuery = useQuery({
    queryKey: ["payment-contract", paymentQuery.data?.contract],
    queryFn: () => getContract(paymentQuery.data!.contract!),
    enabled: Boolean(paymentQuery.data?.contract),
  });

  const invoiceQuery = useQuery({
    queryKey: ["payment-invoice", paymentQuery.data?.invoice],
    queryFn: () => getInvoice(paymentQuery.data!.invoice!),
    enabled: Boolean(paymentQuery.data?.invoice),
  });

  if (paymentQuery.isPending) {
    return <LoadingState title="Loading payment..." />;
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return <ErrorState description="This payment could not be loaded." />;
  }

  const payment = paymentQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment detail"
        description="Review payment metadata, linked invoice or contract, and settlement direction."
        actions={
          <Link to="/payments">
            <Button variant="outline">Back to list</Button>
          </Link>
        }
      />

      <DetailPanel
        title="Payment profile"
        description="Each payment creates a financial transaction in the backend ledger."
        items={[
          { label: "Amount", value: <MoneyDisplay amount={payment.amount} /> },
          { label: "Status", value: <BadgeStatus status={payment.status} /> },
          { label: "Type", value: formatEnumLabel(payment.type) },
          { label: "Direction", value: formatEnumLabel(payment.direction) },
          { label: "Method", value: getPaymentMethodLabel(payment.method) },
          { label: "Paid at", value: formatDateTime(payment.paid_at) },
          { label: "Client", value: clientQuery.data?.full_name ?? "-" },
          { label: "Contract", value: contractQuery.data?.contract_number ?? "-" },
          { label: "Invoice", value: invoiceQuery.data?.invoice_number ?? "-" },
          { label: "Reference", value: payment.reference || "-" },
          { label: "Notes", value: payment.notes || "-" },
        ]}
      />
    </div>
  );
}
