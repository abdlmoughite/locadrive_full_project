import { CalendarRange, Car, CircleDollarSign, FileWarning, HandCoins, Wallet } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DataTable } from "@/components/tables/DataTable";
import { useAuthStore } from "@/features/auth/authStore";
import {
  dashboardKeys,
  getAgenciesSnapshot,
  getAgencyDashboardSummary,
  getSubscriptionsSnapshot,
  getUsersSnapshot,
} from "@/features/dashboard/api";
import { AgencyDashboardCharts } from "@/features/dashboard/components/AgencyDashboardCharts";
import { SuperadminOverview } from "@/features/dashboard/components/SuperadminOverview";
import { formatDate } from "@/lib/formatters";

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isSuperadmin = user?.role === "SUPERADMIN";

  const agencySummaryQuery = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getAgencyDashboardSummary,
    enabled: !isSuperadmin,
  });

  const [agenciesQuery, usersQuery, subscriptionsQuery] = useQueries({
    queries: [
      {
        queryKey: dashboardKeys.agencies(),
        queryFn: getAgenciesSnapshot,
        enabled: isSuperadmin,
      },
      {
        queryKey: dashboardKeys.users(),
        queryFn: getUsersSnapshot,
        enabled: isSuperadmin,
      },
      {
        queryKey: dashboardKeys.subscriptions(),
        queryFn: getSubscriptionsSnapshot,
        enabled: isSuperadmin,
      },
    ],
  });

  const loading = isSuperadmin
    ? agenciesQuery.isPending || usersQuery.isPending || subscriptionsQuery.isPending
    : agencySummaryQuery.isPending;

  const error = isSuperadmin
    ? agenciesQuery.error || usersQuery.error || subscriptionsQuery.error
    : agencySummaryQuery.error;

  if (loading) {
    return <LoadingState title={t("dashboard.loading")} />;
  }

  if (error) {
    return <ErrorState description={t("dashboard.error")} />;
  }

  if (isSuperadmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("ui.platformDashboardTitle")}
          description={t("ui.platformDashboardDescription")}
        />
        <SuperadminOverview
          agencies={agenciesQuery.data ?? []}
          users={usersQuery.data ?? []}
          subscriptions={subscriptionsQuery.data ?? []}
        />
      </div>
    );
  }

  const summary = agencySummaryQuery.data;

  if (!summary) {
    return <ErrorState description={t("dashboard.summaryUnavailable")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("dashboard.stats.totalCars")} value={summary.total_cars} subtitle={t("dashboard.subtitles.totalCars")} icon={Car} />
        <StatCard title={t("dashboard.stats.availableCars")} value={summary.cars_available} subtitle={t("dashboard.subtitles.availableCars")} icon={Car} tone="success" />
        <StatCard title={t("dashboard.stats.rentedCars")} value={summary.cars_rented} subtitle={t("dashboard.subtitles.rentedCars")} icon={Car} />
        <StatCard title={t("dashboard.stats.maintenanceCars")} value={summary.cars_maintenance} subtitle={t("dashboard.subtitles.maintenanceCars")} icon={Car} tone="warning" />
        <StatCard title={t("dashboard.stats.inactiveCars")} value={summary.inactive_cars} subtitle={t("dashboard.subtitles.inactiveCars")} icon={Car} tone="danger" />
        <StatCard title={t("dashboard.stats.activeReservations")} value={summary.active_reservations} subtitle={t("dashboard.subtitles.activeReservations")} icon={CalendarRange} />
        <StatCard title={t("dashboard.stats.activeContracts")} value={summary.active_contracts} subtitle={t("dashboard.subtitles.activeContracts")} icon={CalendarRange} />
        <StatCard title={t("dashboard.stats.clients")} value={summary.total_clients} subtitle={t("dashboard.subtitles.clients")} icon={FileWarning} />
        <StatCard title={t("dashboard.stats.revenueToday")} value={<MoneyDisplay amount={summary.revenue_today} />} subtitle={t("dashboard.subtitles.revenueToday")} icon={Wallet} />
        <StatCard title={t("dashboard.stats.revenueMonth")} value={<MoneyDisplay amount={summary.revenue_this_month} />} subtitle={t("dashboard.subtitles.revenueMonth")} icon={Wallet} />
        <StatCard title={t("dashboard.stats.expensesMonth")} value={<MoneyDisplay amount={summary.expenses_this_month} />} subtitle={t("dashboard.subtitles.expensesMonth")} icon={CircleDollarSign} tone="danger" />
        <StatCard title={t("dashboard.stats.profitMonth")} value={<MoneyDisplay amount={summary.net_profit_this_month} />} subtitle={t("dashboard.subtitles.profitMonth")} icon={HandCoins} tone="success" />
        <StatCard title={t("dashboard.stats.depositsHeld")} value={<MoneyDisplay amount={summary.deposits_held} />} subtitle={t("dashboard.subtitles.depositsHeld")} icon={HandCoins} />
        <StatCard title={t("dashboard.stats.clientDebts")} value={<MoneyDisplay amount={summary.client_debts} />} subtitle={t("dashboard.subtitles.clientDebts")} icon={FileWarning} tone="warning" />
        <StatCard title={t("dashboard.stats.unpaidInvoices")} value={summary.unpaid_invoices} subtitle={t("dashboard.subtitles.unpaidInvoices")} icon={FileWarning} tone="danger" />
        <StatCard title={t("dashboard.stats.returnsToday")} value={summary.returns_today} subtitle={t("dashboard.subtitles.returnsToday")} icon={CalendarRange} tone="warning" />
      </div>

      <AgencyDashboardCharts summary={summary} />

      <DataTable
        columns={[
          {
            key: "client__full_name",
            header: t("common.client"),
            render: (reservation) => reservation.client__full_name,
          },
          {
            key: "car__plate_number",
            header: t("common.car"),
            render: (reservation) => `${reservation.car__plate_number} · ${reservation.car__brand} ${reservation.car__model}`,
          },
          {
            key: "start_date",
            header: t("common.startDate"),
            render: (reservation) => formatDate(reservation.start_date),
          },
          {
            key: "end_date",
            header: t("common.endDate"),
            render: (reservation) => formatDate(reservation.end_date),
          },
          {
            key: "status",
            header: t("common.status"),
            render: (reservation) => <BadgeStatus status={reservation.status} />,
          },
          {
            key: "estimated_total",
            header: t("dashboard.stats.revenueToday"),
            render: (reservation) => <MoneyDisplay amount={reservation.estimated_total} />,
          },
        ]}
        rows={summary.recent_reservations}
        emptyTitle={t("dashboard.charts.recentReservations")}
        emptyDescription={t("dashboard.charts.recentReservationsDescription")}
      />
    </div>
  );
}
