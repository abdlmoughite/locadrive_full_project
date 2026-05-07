import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { getCar } from "@/features/cars/api";
import { getContract } from "@/features/contracts/api";
import { expensesKeys, getExpense } from "@/features/expenses/api";
import { formatDate, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";

export default function ExpenseDetailPage() {
  const { id = "" } = useParams();

  const expenseQuery = useQuery({
    queryKey: expensesKeys.detail(id),
    queryFn: () => getExpense(id),
    enabled: Boolean(id),
  });

  const carQuery = useQuery({
    queryKey: ["expense-car", expenseQuery.data?.car],
    queryFn: () => getCar(expenseQuery.data!.car!),
    enabled: Boolean(expenseQuery.data?.car),
  });

  const contractQuery = useQuery({
    queryKey: ["expense-contract", expenseQuery.data?.contract],
    queryFn: () => getContract(expenseQuery.data!.contract!),
    enabled: Boolean(expenseQuery.data?.contract),
  });

  if (expenseQuery.isPending) {
    return <LoadingState title="Loading expense..." />;
  }

  if (expenseQuery.isError || !expenseQuery.data) {
    return <ErrorState description="This expense could not be loaded." />;
  }

  const expense = expenseQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.title}
        description="Expense details and linked operational context."
        actions={
          <>
            <Link to="/expenses">
              <Button variant="outline">Back to list</Button>
            </Link>
            <Link to={`/expenses/${expense.id}/edit`}>
              <Button>Edit expense</Button>
            </Link>
          </>
        }
      />

      <DetailPanel
        title="Expense profile"
        description="Expenses reduce profit and are reflected in the finance report."
        items={[
          { label: "Category", value: formatEnumLabel(expense.category) },
          { label: "Amount", value: <MoneyDisplay amount={expense.amount} /> },
          { label: "Payment method", value: getPaymentMethodLabel(expense.payment_method) },
          { label: "Supplier", value: expense.supplier_name || "-" },
          { label: "Expense date", value: formatDate(expense.expense_date) },
          { label: "Car", value: carQuery.data?.plate_number ?? "-" },
          { label: "Contract", value: contractQuery.data?.contract_number ?? "-" },
          { label: "Description", value: expense.description || "-" },
          {
            label: "Invoice file",
            value: expense.invoice_file ? (
              <a className="font-semibold text-blue-600" href={expense.invoice_file} target="_blank" rel="noreferrer">
                Open attachment
              </a>
            ) : (
              "-"
            ),
          },
        ]}
      />
    </div>
  );
}
