import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { FormField } from "@/components/forms/FormField";
import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyDisplay } from "@/components/common/MoneyDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { canOverrideBlacklist } from "@/config/permissions";
import { useAuthStore } from "@/features/auth/authStore";
import {
  addClientNote,
  addClientWarning,
  blacklistClient,
  clientsKeys,
  getClient,
  getClientContracts,
  getClientDeposits,
  getClientHistory,
  getClientIncidents,
  getClientInvoices,
  getClientPayments,
  unblacklistClient,
} from "@/features/clients/api";
import { getErrorMessage } from "@/lib/apiClient";
import { formatDate, formatDateTime } from "@/lib/formatters";

const clientTabs = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "contracts", label: "Contracts" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "deposits", label: "Deposits / Daman" },
  { key: "incidents", label: "Incidents" },
] as const;

type ClientTabKey = (typeof clientTabs)[number]["key"];
const clientNoteSchema = z.object({
  note: z.string().min(1, "Note is required."),
});
const clientActionSchema = z.object({
  reason: z.string().min(1, "Reason is required."),
  note: z.string().optional(),
});
type ClientNoteFormValues = z.infer<typeof clientNoteSchema>;
type ClientActionFormValues = z.infer<typeof clientActionSchema>;

export default function ClientDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<ClientTabKey>("overview");
  const [modal, setModal] = useState<null | "note" | "warning" | "blacklist" | "unblacklist">(null);
  const noteForm = useForm<ClientNoteFormValues>({
    resolver: zodResolver(clientNoteSchema) as never,
    defaultValues: {
      note: "",
    },
  });
  const actionForm = useForm<ClientActionFormValues>({
    resolver: zodResolver(clientActionSchema) as never,
    defaultValues: {
      reason: "",
      note: "",
    },
  });

  const clientQuery = useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: () => getClient(id),
    enabled: Boolean(id),
  });

  const [historyQuery, contractsQuery, invoicesQuery, paymentsQuery, depositsQuery, incidentsQuery] = useQueries({
    queries: [
      { queryKey: clientsKeys.history(id), queryFn: () => getClientHistory(id), enabled: Boolean(id) },
      { queryKey: ["client-contracts", id], queryFn: () => getClientContracts(id), enabled: Boolean(id) },
      { queryKey: ["client-invoices", id], queryFn: () => getClientInvoices(id), enabled: Boolean(id) },
      { queryKey: ["client-payments", id], queryFn: () => getClientPayments(id), enabled: Boolean(id) },
      { queryKey: ["client-deposits", id], queryFn: () => getClientDeposits(id), enabled: Boolean(id) },
      { queryKey: ["client-incidents", id], queryFn: () => getClientIncidents(id), enabled: Boolean(id) },
    ],
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: clientsKeys.detail(id) });
    await queryClient.invalidateQueries({ queryKey: clientsKeys.history(id) });
    await queryClient.invalidateQueries({ queryKey: clientsKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["client-contracts", id] });
    await queryClient.invalidateQueries({ queryKey: ["client-invoices", id] });
    await queryClient.invalidateQueries({ queryKey: ["client-payments", id] });
    await queryClient.invalidateQueries({ queryKey: ["client-deposits", id] });
    await queryClient.invalidateQueries({ queryKey: ["client-incidents", id] });
  };

  const noteMutation = useMutation({
    mutationFn: (values: ClientNoteFormValues) => addClientNote(id, values.note),
    onSuccess: async () => {
      toast.success("Client note added.");
      setModal(null);
      noteForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, noteForm.setError);
      toast.error("Unable to add note", { description: getErrorMessage(error) });
    },
  });

  const warningMutation = useMutation({
    mutationFn: (values: ClientActionFormValues) => addClientWarning(id, values),
    onSuccess: async () => {
      toast.success("Warning added to client profile.");
      setModal(null);
      actionForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, actionForm.setError);
      toast.error("Unable to add warning", { description: getErrorMessage(error) });
    },
  });

  const blacklistMutation = useMutation({
    mutationFn: (values: ClientActionFormValues) => blacklistClient(id, values),
    onSuccess: async () => {
      toast.success("Client blacklisted successfully.");
      setModal(null);
      actionForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, actionForm.setError);
      toast.error("Unable to blacklist client", { description: getErrorMessage(error) });
    },
  });

  const unblacklistMutation = useMutation({
    mutationFn: (values: ClientActionFormValues) => unblacklistClient(id, values),
    onSuccess: async () => {
      toast.success("Client removed from blacklist.");
      setModal(null);
      actionForm.reset();
      await refresh();
    },
    onError: (error) => {
      applyServerValidationErrors(error, actionForm.setError);
      toast.error("Unable to unblacklist client", { description: getErrorMessage(error) });
    },
  });

  if (clientQuery.isPending) {
    return <LoadingState title="Loading client profile..." />;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return <ErrorState description="This client could not be loaded." />;
  }

  const client = clientQuery.data;
  const allowOverride = canOverrideBlacklist(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.full_name}
        description="Client financial health, booking history, and blacklist controls."
        actions={
          <>
            <Link to={`/clients/${client.id}/edit`}>
              <Button variant="outline">Edit profile</Button>
            </Link>
            <Button variant="outline" onClick={() => setModal("note")}>
              Add note
            </Button>
            <Button variant="outline" onClick={() => setModal("warning")}>
              Add warning
            </Button>
            {client.blacklisted ? (
              allowOverride ? (
                <Button variant="success" onClick={() => setModal("unblacklist")}>
                  Unblacklist
                </Button>
              ) : null
            ) : (
              <Button variant="danger" onClick={() => setModal("blacklist")}>
                Blacklist
              </Button>
            )}
          </>
        }
      />

      {client.blacklisted ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="font-semibold">Blacklisted client</p>
          <p className="mt-1 text-sm">
            Agents cannot create contracts for this client. Owners can override only with a required reason during contract creation.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {clientTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <DetailPanel
          title="Client overview"
          description="Client profile information, financial standing, and rental activity snapshot."
          items={[
            { label: "Status", value: <BadgeStatus status={client.status} /> },
            { label: "Phone", value: client.phone },
            { label: "Email", value: client.email || "-" },
            { label: "CIN", value: client.cin || "-" },
            { label: "Passport", value: client.passport || "-" },
            { label: "Driving licence", value: client.driving_license || "-" },
            { label: "Address", value: client.address || "-" },
            { label: "Birth date", value: formatDate(client.birth_date) },
            { label: "Total spent", value: <MoneyDisplay amount={client.total_spent} /> },
            { label: "Total debt", value: <MoneyDisplay amount={client.total_debt} /> },
            { label: "Contracts", value: client.total_contracts },
            { label: "Last rental", value: formatDate(client.last_rental_date) },
          ]}
        />
      ) : null}

      {activeTab === "history" ? (
        <Card>
          <CardHeader>
            <CardTitle>History timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.data?.length ? (
              historyQuery.data.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.event_type}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No history events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "contracts" ? (
        <DataTable
          columns={[
            { key: "contract_number", header: "Contract", render: (contract) => contract.contract_number },
            { key: "start_date", header: "Start", render: (contract) => formatDate(contract.start_date) },
            { key: "expected_return_date", header: "Expected return", render: (contract) => formatDate(contract.expected_return_date) },
            { key: "status", header: "Status", render: (contract) => <BadgeStatus status={contract.status} /> },
            { key: "total_amount", header: "Total", render: (contract) => <MoneyDisplay amount={contract.total_amount} /> },
          ]}
          rows={contractsQuery.data ?? []}
          loading={contractsQuery.isPending}
          error={contractsQuery.isError ? "Unable to load contracts." : null}
          emptyTitle="No contracts found"
          emptyDescription="Contracts linked to this client will appear here."
        />
      ) : null}

      {activeTab === "invoices" ? (
        <DataTable
          columns={[
            { key: "invoice_number", header: "Invoice", render: (invoice) => invoice.invoice_number },
            { key: "issue_date", header: "Issue date", render: (invoice) => formatDate(invoice.issue_date) },
            { key: "type", header: "Type", render: (invoice) => invoice.type.replace(/_/g, " ") },
            { key: "status", header: "Status", render: (invoice) => <BadgeStatus status={invoice.status} /> },
            { key: "remaining_amount", header: "Remaining", render: (invoice) => <MoneyDisplay amount={invoice.remaining_amount} /> },
          ]}
          rows={invoicesQuery.data ?? []}
          loading={invoicesQuery.isPending}
          error={invoicesQuery.isError ? "Unable to load invoices." : null}
          emptyTitle="No invoices found"
          emptyDescription="Invoices linked to this client will appear here."
        />
      ) : null}

      {activeTab === "payments" ? (
        <DataTable
          columns={[
            { key: "paid_at", header: "Paid at", render: (payment) => formatDateTime(payment.paid_at) },
            { key: "amount", header: "Amount", render: (payment) => <MoneyDisplay amount={payment.amount} /> },
            { key: "type", header: "Type", render: (payment) => payment.type.replace(/_/g, " ") },
            { key: "method", header: "Method", render: (payment) => payment.method.replace(/_/g, " ") },
            { key: "status", header: "Status", render: (payment) => <BadgeStatus status={payment.status} /> },
          ]}
          rows={paymentsQuery.data ?? []}
          loading={paymentsQuery.isPending}
          error={paymentsQuery.isError ? "Unable to load payments." : null}
          emptyTitle="No payments found"
          emptyDescription="Collected payments for this client will appear here."
        />
      ) : null}

      {activeTab === "deposits" ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            <p className="font-semibold">Deposit / Daman is tracked separately</p>
            <p className="mt-1 text-sm">
              Held deposits are not revenue or profit until part of the deposit is legally used for damage or debt settlement.
            </p>
          </div>
          <DataTable
            columns={[
              { key: "held_at", header: "Held at", render: (deposit) => formatDateTime(deposit.held_at) },
              { key: "amount", header: "Amount", render: (deposit) => <MoneyDisplay amount={deposit.amount} /> },
              { key: "held_amount", header: "Held", render: (deposit) => <MoneyDisplay amount={deposit.held_amount} /> },
              { key: "used_amount", header: "Used", render: (deposit) => <MoneyDisplay amount={deposit.used_amount} /> },
              { key: "status", header: "Status", render: (deposit) => <BadgeStatus status={deposit.status} /> },
            ]}
            rows={depositsQuery.data ?? []}
            loading={depositsQuery.isPending}
            error={depositsQuery.isError ? "Unable to load deposits." : null}
            emptyTitle="No deposits found"
            emptyDescription="Held security deposits for this client will appear here."
          />
        </div>
      ) : null}

      {activeTab === "incidents" ? (
        <DataTable
          columns={[
            { key: "type", header: "Type", render: (incident) => incident.type.replace(/_/g, " ") },
            { key: "created_at", header: "Created", render: (incident) => formatDateTime(incident.created_at) },
            { key: "amount", header: "Amount", render: (incident) => <MoneyDisplay amount={incident.amount} /> },
            { key: "status", header: "Status", render: (incident) => <BadgeStatus status={incident.status} /> },
          ]}
          rows={incidentsQuery.data ?? []}
          loading={incidentsQuery.isPending}
          error={incidentsQuery.isError ? "Unable to load incidents." : null}
          emptyTitle="No incidents found"
          emptyDescription="Incidents and claims tied to this client will appear here."
        />
      ) : null}

      <Modal
        open={Boolean(modal)}
        onClose={() => {
          setModal(null);
          noteForm.reset();
          actionForm.reset();
        }}
        title={
          modal === "note"
            ? "Add client note"
            : modal === "warning"
              ? "Add warning"
              : modal === "blacklist"
                ? "Blacklist client"
                : "Unblacklist client"
        }
        description="Every action is recorded by the backend and reflected in client history."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModal(null);
                noteForm.reset();
                actionForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant={modal === "blacklist" ? "danger" : "primary"}
              form={modal === "note" ? "client-note-form" : "client-action-form"}
              type="submit"
              disabled={
                noteMutation.isPending ||
                warningMutation.isPending ||
                blacklistMutation.isPending ||
                unblacklistMutation.isPending
              }
            >
              Save action
            </Button>
          </>
        }
      >
        {modal === "note" ? (
          <form id="client-note-form" className="space-y-2" onSubmit={noteForm.handleSubmit((values) => noteMutation.mutate(values))}>
            <p className="text-sm text-slate-500">Use notes for operational context that should stay on the client profile.</p>
            <FormField label="Note" error={noteForm.formState.errors.note?.message}>
              <Textarea placeholder="Write your note..." {...noteForm.register("note")} />
            </FormField>
          </form>
        ) : (
          <form
            id="client-action-form"
            className="space-y-4"
            onSubmit={actionForm.handleSubmit((values) => {
              if (modal === "warning") {
                warningMutation.mutate(values);
              }
              if (modal === "blacklist") {
                blacklistMutation.mutate(values);
              }
              if (modal === "unblacklist") {
                unblacklistMutation.mutate(values);
              }
            })}
          >
            <FormField label="Reason" htmlFor="reason" error={actionForm.formState.errors.reason?.message}>
              <Textarea id="reason" placeholder="Explain the reason..." {...actionForm.register("reason")} />
            </FormField>
            <FormField label="Note" htmlFor="action-note" error={actionForm.formState.errors.note?.message}>
              <Textarea id="action-note" placeholder="Add supporting notes or context..." {...actionForm.register("note")} />
            </FormField>
          </form>
        )}
      </Modal>
    </div>
  );
}
