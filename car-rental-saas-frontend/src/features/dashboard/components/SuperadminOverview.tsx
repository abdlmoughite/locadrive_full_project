import { Building2, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DataTable } from "@/components/tables/DataTable";
import type { Agency, Subscription, User } from "@/types/common";

export function SuperadminOverview({
  agencies,
  users,
  subscriptions,
}: {
  agencies: Agency[];
  users: User[];
  subscriptions: Subscription[];
}) {
  const { t } = useTranslation();
  const activeAgencies = agencies.filter((agency) => agency.subscription_status === "ACTIVE").length;
  const ownerCount = users.filter((user) => user.role === "AGENCY_OWNER").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("common.agencies")} value={agencies.length} subtitle={t("ui.totalTenants")} icon={Building2} />
        <StatCard title={t("ui.activeAgencies")} value={activeAgencies} subtitle={t("ui.activeAgenciesDescription")} icon={ShieldCheck} tone="success" />
        <StatCard title={t("navigation.items.subscriptions")} value={subscriptions.length} subtitle={t("ui.subscriptionsDescription")} icon={ReceiptText} />
        <StatCard title={t("ui.agencyOwners")} value={ownerCount} subtitle={t("ui.agencyOwnersDescription")} icon={Users} />
      </div>

      <ChartCard title={t("ui.latestAgencies")} description={t("ui.latestAgenciesDescription")}>
        <DataTable
          columns={[
            { key: "name", header: t("common.agency"), render: (agency) => agency.name },
            { key: "email", header: t("common.email"), render: (agency) => agency.email },
            { key: "phone", header: t("common.phone"), render: (agency) => agency.phone },
            { key: "status", header: t("common.subscription"), render: (agency) => <BadgeStatus status={agency.subscription_status} /> },
          ]}
          rows={agencies.slice(0, 6)}
        />
      </ChartCard>
    </div>
  );
}
