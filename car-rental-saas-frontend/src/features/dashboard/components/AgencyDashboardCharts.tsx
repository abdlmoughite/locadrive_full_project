import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { ChartCard } from "@/components/charts/ChartCard";
import { formatMoney } from "@/lib/formatters";
import type { DashboardSummary } from "@/types/common";

const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export function AgencyDashboardCharts({ summary }: { summary: DashboardSummary }) {
  const { t } = useTranslation();
  const financeData = [
    { label: t("dashboard.stats.revenueMonth"), value: Number(summary.revenue_this_month) },
    { label: t("dashboard.stats.expensesMonth"), value: Number(summary.expenses_this_month) },
    { label: t("dashboard.stats.profitMonth"), value: Number(summary.net_profit_this_month) },
  ];
  const fleetData = [
    { name: t("dashboard.stats.availableCars"), value: summary.cars_available },
    { name: t("dashboard.stats.rentedCars"), value: summary.cars_rented },
    { name: t("dashboard.stats.maintenanceCars"), value: summary.cars_maintenance },
    { name: t("dashboard.stats.inactiveCars"), value: summary.inactive_cars },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title={t("dashboard.charts.revenueVsExpenses")} description={t("dashboard.charts.revenueVsExpensesDescription")}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financeData}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatMoney(value)} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <ChartCard title={t("dashboard.charts.fleetStatus")} description={t("dashboard.charts.fleetStatusDescription")}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={fleetData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110}>
                {fleetData.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
