import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/authStore";
import { deleteExpense, expensesKeys, getExpenses } from "@/features/expenses/api";
import { useCarLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { expenseCategories, pageSize } from "@/lib/constants";
import { formatDate, formatEnumLabel, getPaymentMethodLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/apiClient";
import type { Expense } from "@/types/common";

export default function ExpensesListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const carsQuery = useCarLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      category: category || undefined,
      expense_date__gte: dateRange.startDate || undefined,
      expense_date__lte: dateRange.endDate || undefined,
      ordering: "-expense_date",
    }),
    [category, dateRange.endDate, dateRange.startDate, debouncedSearch, page],
  );

  const expensesQuery = useQuery({
    queryKey: expensesKeys.list(params),
    queryFn: () => getExpenses(params),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      toast.success(t("ui.expenseDeleted", { defaultValue: "Expense deleted successfully." }));
      setSelectedExpense(null);
      await queryClient.invalidateQueries({ queryKey: expensesKeys.all });
    },
    onError: (error) => toast.error(t("ui.deleteExpenseError", { defaultValue: "Unable to delete expense" }), { description: getErrorMessage(error) }),
  });

  const cars = carsQuery.data?.results ?? [];
  const allowDelete = user?.role === "SUPERADMIN" || user?.role === "AGENCY_OWNER";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.expenses")}
        description={t("ui.expensesDescription")}
        actions={
          <Link to="/expenses/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("ui.newExpense")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_220px_320px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchExpenses")} />
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">{t("common.allCategories")}</option>
          {expenseCategories.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <DateRangeFilter startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
      </div>

      <DataTable
        columns={[
          { key: "title", header: t("common.expense"), render: (expense) => expense.title },
          { key: "category", header: t("common.category"), render: (expense) => formatEnumLabel(expense.category) },
          { key: "amount", header: t("common.amount"), render: (expense) => <MoneyDisplay amount={expense.amount} /> },
          { key: "payment_method", header: t("common.method"), render: (expense) => getPaymentMethodLabel(expense.payment_method) },
          { key: "supplier_name", header: t("common.supplier"), render: (expense) => expense.supplier_name || "-" },
          { key: "expense_date", header: t("common.date"), render: (expense) => formatDate(expense.expense_date) },
          {
            key: "car",
            header: t("common.car"),
            render: (expense) => cars.find((car) => car.id === expense.car)?.plate_number ?? "-",
          },
          {
            key: "actions",
            header: t("common.actions"),
            render: (expense) => (
              <div className="flex flex-wrap gap-2">
                <Link to={`/expenses/${expense.id}`}>
                  <Button size="sm" variant="outline">
                    {t("common.view")}
                  </Button>
                </Link>
                <Link to={`/expenses/${expense.id}/edit`}>
                  <Button size="sm" variant="outline">
                    {t("common.edit")}
                  </Button>
                </Link>
                {allowDelete ? (
                  <Button size="sm" variant="danger" onClick={() => setSelectedExpense(expense)}>
                    {t("common.delete")}
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
        rows={expensesQuery.data?.results ?? []}
        loading={expensesQuery.isPending}
        error={expensesQuery.isError ? t("ui.noExpenses") : null}
        emptyTitle={t("ui.noExpenses")}
        emptyDescription={t("ui.noExpensesDescription")}
        page={page}
        pageSize={pageSize}
        total={expensesQuery.data?.count ?? 0}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(selectedExpense)}
        title={t("ui.deleteExpense")}
        description={t("ui.deleteExpenseDescription")}
        confirmLabel={t("ui.deleteExpense")}
        loading={deleteMutation.isPending}
        onClose={() => setSelectedExpense(null)}
        onConfirm={() => {
          if (selectedExpense) {
            deleteMutation.mutate(selectedExpense.id);
          }
        }}
      />
    </div>
  );
}
