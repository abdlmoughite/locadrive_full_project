import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/charts/ChartCard";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { CircleDollarSign, HandCoins, ReceiptText, Wallet } from "lucide-react";
import { getFinanceSummary, reportsKeys } from "@/features/reports/api";
import { formatMoney } from "@/lib/formatters";

export default function FinanceReportPage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const reportQuery = useQuery({
    queryKey: reportsKeys.finance({
      start_date: dateRange.startDate || undefined,
      end_date: dateRange.endDate || undefined,
    }),
    queryFn: () =>
      getFinanceSummary({
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      }),
  });

  if (reportQuery.isPending) {
    return <LoadingState title="Loading finance summary..." />;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return <ErrorState description="Finance summary is unavailable." />;
  }

  const summary = reportQuery.data;
  const chartData = [
    { name: "Revenue", value: Number(summary.total_revenue) },
    { name: "Expenses", value: Number(summary.total_expenses) },
    { name: "Net profit", value: Number(summary.net_profit) },
    { name: "Deposits held", value: Number(summary.deposits_currently_held) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance summary"
        description="Revenue excludes held deposits. Net profit is revenue minus expenses only."
        actions={<DateRangeFilter startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total revenue" value={<MoneyDisplay amount={summary.total_revenue} />} subtitle="Deposit holds excluded." icon={Wallet} tone="success" />
        <StatCard title="Total expenses" value={<MoneyDisplay amount={summary.total_expenses} />} subtitle="Agency operating costs." icon={CircleDollarSign} tone="danger" />
        <StatCard title="Net profit" value={<MoneyDisplay amount={summary.net_profit} />} subtitle="Revenue minus expenses." icon={HandCoins} tone="success" />
        <StatCard title="Unpaid invoices" value={<MoneyDisplay amount={summary.unpaid_invoices} />} subtitle="Outstanding invoice balance." icon={ReceiptText} tone="warning" />
        <StatCard title="Deposits received" value={<MoneyDisplay amount={summary.deposits_received} />} subtitle="Tracked separately from profit." icon={ReceiptText} />
        <StatCard title="Deposits refunded" value={<MoneyDisplay amount={summary.deposits_refunded} />} subtitle="Refunded security holds." icon={ReceiptText} />
        <StatCard title="Deposits held" value={<MoneyDisplay amount={summary.deposits_currently_held} />} subtitle="Current held security deposits." icon={ReceiptText} />
        <StatCard title="Client debts" value={<MoneyDisplay amount={summary.client_debts} />} subtitle="Open client debt exposure." icon={ReceiptText} tone="warning" />
      </div>

      <ChartCard title="Finance snapshot" description="A quick comparison of revenue, expenses, profit, and held deposits.">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatMoney} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
