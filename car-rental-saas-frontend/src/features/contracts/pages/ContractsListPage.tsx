import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { contractsKeys, getContracts } from "@/features/contracts/api";
import { useClientLookup, useCarLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { contractStatuses, pageSize } from "@/lib/constants";
import { formatDate, formatEnumLabel } from "@/lib/formatters";

export default function ContractsListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const clientsQuery = useClientLookup();
  const carsQuery = useCarLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      ordering: "-created_at",
    }),
    [debouncedSearch, page, status],
  );

  const contractsQuery = useQuery({
    queryKey: contractsKeys.list(params),
    queryFn: () => getContracts(params),
  });

  const clients = clientsQuery.data?.results ?? [];
  const cars = carsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.contracts")}
        description={t("ui.contractsDescription")}
        actions={
          <Link to="/contracts/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("ui.newContract")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchContracts")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {contractStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={[
          { key: "contract_number", header: t("common.contract"), render: (contract) => contract.contract_number },
          {
            key: "client",
            header: t("common.client"),
            render: (contract) => clients.find((client) => client.id === contract.client)?.full_name ?? contract.client,
          },
          {
            key: "car",
            header: t("common.car"),
            render: (contract) => {
              const car = cars.find((item) => item.id === contract.car);
              return car ? `${car.plate_number} · ${car.brand} ${car.model}` : contract.car;
            },
          },
          { key: "start_date", header: t("common.start"), render: (contract) => formatDate(contract.start_date) },
          { key: "expected_return_date", header: t("common.expectedReturn"), render: (contract) => formatDate(contract.expected_return_date) },
          { key: "total_amount", header: t("common.total"), render: (contract) => <MoneyDisplay amount={contract.total_amount} /> },
          { key: "paid_amount", header: t("common.paid"), render: (contract) => <MoneyDisplay amount={contract.paid_amount} /> },
          { key: "remaining_amount", header: t("common.remaining"), render: (contract) => <MoneyDisplay amount={contract.remaining_amount} /> },
          { key: "status", header: t("common.status"), render: (contract) => <BadgeStatus status={contract.status} /> },
          {
            key: "actions",
            header: t("common.actions"),
            render: (contract) => (
              <Link to={`/contracts/${contract.id}`}>
                <Button size="sm" variant="outline">
                  {t("common.view")}
                </Button>
              </Link>
            ),
          },
        ]}
        rows={contractsQuery.data?.results ?? []}
        loading={contractsQuery.isPending}
        error={contractsQuery.isError ? t("ui.noContracts") : null}
        emptyTitle={t("ui.noContracts")}
        emptyDescription={t("ui.noContractsDescription")}
        page={page}
        pageSize={pageSize}
        total={contractsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
