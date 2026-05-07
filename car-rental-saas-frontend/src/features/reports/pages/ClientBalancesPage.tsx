import { useQuery } from "@tanstack/react-query";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { getClientBalances, reportsKeys } from "@/features/reports/api";

export default function ClientBalancesPage() {
  const reportQuery = useQuery({
    queryKey: reportsKeys.clientBalances(),
    queryFn: getClientBalances,
  });

  if (reportQuery.isPending) {
    return <LoadingState title="Loading client balances..." />;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return <ErrorState description="Client balance report is unavailable." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client balances"
        description="Review total paid, unpaid, debt, active deposits, and blacklist posture for each client."
      />

      <DataTable
        columns={[
          {
            key: "client",
            header: "Client",
            render: (row) => (
              <div>
                <p className="font-semibold text-slate-950">{row.client.full_name}</p>
                <p className="text-xs text-slate-500">{row.client.phone}</p>
              </div>
            ),
          },
          { key: "total_paid", header: "Total paid", render: (row) => <MoneyDisplay amount={row.total_paid} /> },
          { key: "total_unpaid", header: "Total unpaid", render: (row) => <MoneyDisplay amount={row.total_unpaid} /> },
          { key: "total_debt", header: "Total debt", render: (row) => <MoneyDisplay amount={row.total_debt} /> },
          { key: "active_deposit", header: "Active deposit", render: (row) => <MoneyDisplay amount={row.active_deposit} /> },
          { key: "blacklist_status", header: "Blacklist status", render: (row) => <BadgeStatus status={row.blacklist_status} /> },
        ]}
        rows={reportQuery.data}
        emptyTitle="No client balances"
        emptyDescription="Client balance data will appear here once the backend has invoice and payment activity."
      />
    </div>
  );
}
