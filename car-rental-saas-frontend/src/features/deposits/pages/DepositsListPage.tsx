import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { depositsKeys, getDeposits } from "@/features/deposits/api";
import { useClientLookup, useContractLookup, useCarLookup } from "@/hooks/useLookups";
import { depositStatuses, pageSize } from "@/lib/constants";
import { formatDateTime, formatEnumLabel } from "@/lib/formatters";

export default function DepositsListPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const clientsQuery = useClientLookup();
  const contractsQuery = useContractLookup();
  const carsQuery = useCarLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      status: status || undefined,
      ordering: "-held_at",
    }),
    [page, status],
  );

  const depositsQuery = useQuery({
    queryKey: depositsKeys.list(params),
    queryFn: () => getDeposits(params),
  });

  const clients = clientsQuery.data?.results ?? [];
  const contracts = contractsQuery.data?.results ?? [];
  const cars = carsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ui.depositsTitle")}
        description={t("ui.depositsDescription")}
      />

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
        <p className="font-semibold">{t("ui.depositRuleTitle")}</p>
        <p className="mt-1 text-sm">{t("ui.depositRuleDescription")}</p>
      </div>

      <div className="max-w-xs">
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {depositStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={[
          {
            key: "client",
            header: t("common.client"),
            render: (deposit) => clients.find((client) => client.id === deposit.client)?.full_name ?? deposit.client,
          },
          {
            key: "contract",
            header: t("common.contract"),
            render: (deposit) => contracts.find((contract) => contract.id === deposit.contract)?.contract_number ?? deposit.contract,
          },
          {
            key: "car",
            header: t("common.car"),
            render: (deposit) => cars.find((car) => car.id === deposit.car)?.plate_number ?? deposit.car,
          },
          { key: "amount", header: t("common.amount"), render: (deposit) => <MoneyDisplay amount={deposit.amount} /> },
          { key: "held_amount", header: t("common.held"), render: (deposit) => <MoneyDisplay amount={deposit.held_amount} /> },
          { key: "used_amount", header: t("common.used"), render: (deposit) => <MoneyDisplay amount={deposit.used_amount} /> },
          { key: "refunded_amount", header: t("common.refunded"), render: (deposit) => <MoneyDisplay amount={deposit.refunded_amount} /> },
          { key: "status", header: t("common.status"), render: (deposit) => <BadgeStatus status={deposit.status} /> },
          { key: "held_at", header: t("common.heldAt"), render: (deposit) => formatDateTime(deposit.held_at) },
          {
            key: "actions",
            header: t("common.actions"),
            render: (deposit) => (
              <Link to={`/deposits/${deposit.id}`}>
                <Button size="sm" variant="outline">
                  {t("common.view")}
                </Button>
              </Link>
            ),
          },
        ]}
        rows={depositsQuery.data?.results ?? []}
        loading={depositsQuery.isPending}
        error={depositsQuery.isError ? t("ui.noDeposits") : null}
        emptyTitle={t("ui.noDeposits")}
        emptyDescription={t("ui.noDepositsDescription")}
        page={page}
        pageSize={pageSize}
        total={depositsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
