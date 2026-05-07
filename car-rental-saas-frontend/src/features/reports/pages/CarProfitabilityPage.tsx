import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/charts/ChartCard";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { getCarProfitability, reportsKeys } from "@/features/reports/api";
import { formatMoney } from "@/lib/formatters";

export default function CarProfitabilityPage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const reportQuery = useQuery({
    queryKey: reportsKeys.profitability({
      start_date: dateRange.startDate || undefined,
      end_date: dateRange.endDate || undefined,
    }),
    queryFn: () =>
      getCarProfitability({
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      }),
  });

  if (reportQuery.isPending) {
    return <LoadingState title="Loading car profitability..." />;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return <ErrorState description="Car profitability report is unavailable." />;
  }

  const rows = reportQuery.data;
  const chartData = rows.map((row) => ({
    name: row.car.plate_number,
    netProfit: Number(row.net_profit),
    expenses: Number(row.expenses),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Car profitability"
        description="Understand which vehicles are generating revenue after direct expense allocation."
        actions={<DateRangeFilter startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Net profit per car" description="Higher bars indicate healthier vehicle contribution.">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatMoney} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Bar dataKey="netProfit" radius={[14, 14, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Expenses per car" description="Useful for spotting vehicles with excessive operating cost.">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatMoney} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Bar dataKey="expenses" radius={[14, 14, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <DataTable
        columns={[
          { key: "car", header: "Car", render: (row) => `${row.car.plate_number} · ${row.car.label}` },
          { key: "rental_revenue", header: "Rental revenue", render: (row) => <MoneyDisplay amount={row.rental_revenue} /> },
          { key: "extra_fees", header: "Extra fees", render: (row) => <MoneyDisplay amount={row.extra_fees} /> },
          { key: "total_revenue", header: "Total revenue", render: (row) => <MoneyDisplay amount={row.total_revenue} /> },
          { key: "expenses", header: "Expenses", render: (row) => <MoneyDisplay amount={row.expenses} /> },
          { key: "net_profit", header: "Net profit", render: (row) => <MoneyDisplay amount={row.net_profit} /> },
          { key: "contracts_count", header: "Contracts", render: (row) => row.contracts_count },
        ]}
        rows={rows}
        emptyTitle="No profitability data"
        emptyDescription="Car profitability will appear once the backend has rental and expense activity in the selected range."
      />
    </div>
  );
}
