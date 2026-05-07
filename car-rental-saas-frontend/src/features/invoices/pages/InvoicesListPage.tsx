import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { financeKeys, getInvoices } from "@/features/invoices/api";
import { useClientLookup, useContractLookup } from "@/hooks/useLookups";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { invoiceStatuses, invoiceTypes, pageSize } from "@/lib/constants";
import { formatDate, formatEnumLabel } from "@/lib/formatters";

export default function InvoicesListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const debouncedSearch = useDebouncedValue(search, 300);
  const clientsQuery = useClientLookup();
  const contractsQuery = useContractLookup();

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: debouncedSearch,
      status: status || undefined,
      type: type || undefined,
      issue_date__gte: dateRange.startDate || undefined,
      issue_date__lte: dateRange.endDate || undefined,
      ordering: "-issue_date",
    }),
    [dateRange.endDate, dateRange.startDate, debouncedSearch, page, status, type],
  );

  const invoicesQuery = useQuery({
    queryKey: financeKeys.invoiceList(params),
    queryFn: () => getInvoices(params),
  });

  const clients = clientsQuery.data?.results ?? [];
  const contracts = contractsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("common.invoices")}
        description={t("ui.invoicesDescription")}
        actions={
          <Link to="/invoices/create">
            <Button>
              <Plus className="h-4 w-4" />
              {t("ui.newInvoice")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_320px]">
        <SearchInput value={search} onChange={setSearch} placeholder={t("ui.searchInvoices")} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("common.allStatuses")}</option>
          {invoiceStatuses.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">{t("common.allTypes")}</option>
          {invoiceTypes.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </Select>
        <DateRangeFilter startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
      </div>

      <DataTable
        columns={[
          { key: "invoice_number", header: t("common.invoice"), render: (invoice) => invoice.invoice_number },
          {
            key: "client",
            header: t("common.client"),
            render: (invoice) => clients.find((client) => client.id === invoice.client)?.full_name ?? "-",
          },
          {
            key: "contract",
            header: t("common.contract"),
            render: (invoice) => contracts.find((contract) => contract.id === invoice.contract)?.contract_number ?? "-",
          },
          { key: "type", header: t("common.type"), render: (invoice) => formatEnumLabel(invoice.type) },
          { key: "total_amount", header: t("common.total"), render: (invoice) => <MoneyDisplay amount={invoice.total_amount} /> },
          { key: "paid_amount", header: t("common.paid"), render: (invoice) => <MoneyDisplay amount={invoice.paid_amount} /> },
          { key: "remaining_amount", header: t("common.remaining"), render: (invoice) => <MoneyDisplay amount={invoice.remaining_amount} /> },
          { key: "status", header: t("common.status"), render: (invoice) => <BadgeStatus status={invoice.status} /> },
          { key: "issue_date", header: t("common.issueDate"), render: (invoice) => formatDate(invoice.issue_date) },
          {
            key: "actions",
            header: t("common.actions"),
            render: (invoice) => (
              <Link to={`/invoices/${invoice.id}`}>
                <Button size="sm" variant="outline">
                  {t("common.view")}
                </Button>
              </Link>
            ),
          },
        ]}
        rows={invoicesQuery.data?.results ?? []}
        loading={invoicesQuery.isPending}
        error={invoicesQuery.isError ? t("ui.noInvoices") : null}
        emptyTitle={t("ui.noInvoices")}
        emptyDescription={t("ui.noInvoicesDescription")}
        page={page}
        pageSize={pageSize}
        total={invoicesQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
