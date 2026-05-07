/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotFoundPage } from "@/components/route/NotFoundPage";
import { ScrollToTop } from "@/components/route/ScrollToTop";
import { useAuthStore } from "@/features/auth/authStore";
import LoginPage from "@/features/auth/LoginPage";
import OwnerSignupPage from "@/features/auth/OwnerSignupPage";
import PendingVerificationPage from "@/features/auth/PendingVerificationPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import AgenciesListPage from "@/features/agencies/pages/AgenciesListPage";
import AgencyDetailPage from "@/features/agencies/pages/AgencyDetailPage";
import SubscriptionsPage from "@/features/agencies/pages/SubscriptionsPage";
import UsersPage from "@/features/users/pages/UsersPage";
import ProfilePage from "@/features/users/pages/ProfilePage";
import SettingsPage from "@/features/users/pages/SettingsPage";
import CarsListPage from "@/features/cars/pages/CarsListPage";
import CarFormPage from "@/features/cars/pages/CarFormPage";
import CarDetailPage from "@/features/cars/pages/CarDetailPage";
import ClientsListPage from "@/features/clients/pages/ClientsListPage";
import ClientFormPage from "@/features/clients/pages/ClientFormPage";
import ClientDetailPage from "@/features/clients/pages/ClientDetailPage";
import ReservationsListPage from "@/features/reservations/pages/ReservationsListPage";
import ReservationCreatePage from "@/features/reservations/pages/ReservationCreatePage";
import ReservationDetailPage from "@/features/reservations/pages/ReservationDetailPage";
import ContractsListPage from "@/features/contracts/pages/ContractsListPage";
import ContractCreatePage from "@/features/contracts/pages/ContractCreatePage";
import ContractDetailPage from "@/features/contracts/pages/ContractDetailPage";
import InvoicesListPage from "@/features/invoices/pages/InvoicesListPage";
import InvoiceCreatePage from "@/features/invoices/pages/InvoiceCreatePage";
import InvoiceDetailPage from "@/features/invoices/pages/InvoiceDetailPage";
import PaymentsListPage from "@/features/payments/pages/PaymentsListPage";
import PaymentDetailPage from "@/features/payments/pages/PaymentDetailPage";
import DepositsListPage from "@/features/deposits/pages/DepositsListPage";
import DepositDetailPage from "@/features/deposits/pages/DepositDetailPage";
import ExpensesListPage from "@/features/expenses/pages/ExpensesListPage";
import ExpenseFormPage from "@/features/expenses/pages/ExpenseFormPage";
import ExpenseDetailPage from "@/features/expenses/pages/ExpenseDetailPage";
import MaintenanceListPage from "@/features/maintenance/pages/MaintenanceListPage";
import MaintenanceCreatePage from "@/features/maintenance/pages/MaintenanceCreatePage";
import MaintenanceDetailPage from "@/features/maintenance/pages/MaintenanceDetailPage";
import IncidentsListPage from "@/features/incidents/pages/IncidentsListPage";
import IncidentCreatePage from "@/features/incidents/pages/IncidentCreatePage";
import IncidentDetailPage from "@/features/incidents/pages/IncidentDetailPage";
import FinanceReportPage from "@/features/reports/pages/FinanceReportPage";
import CarProfitabilityPage from "@/features/reports/pages/CarProfitabilityPage";
import ClientBalancesPage from "@/features/reports/pages/ClientBalancesPage";

function RootRedirect() {
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "AGENCY_OWNER" && !user.is_verified) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function RouteRoot() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RouteRoot />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        element: <AuthLayout />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <OwnerSignupPage /> },
          { path: "pending-verification", element: <PendingVerificationPage /> },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "admin/agencies", element: <AgenciesListPage /> },
          { path: "admin/agencies/:id", element: <AgencyDetailPage /> },
          { path: "admin/subscriptions", element: <SubscriptionsPage /> },
          { path: "admin/users", element: <UsersPage adminScope /> },
          { path: "cars", element: <CarsListPage /> },
          { path: "cars/create", element: <CarFormPage mode="create" /> },
          { path: "cars/:id", element: <CarDetailPage /> },
          { path: "cars/:id/edit", element: <CarFormPage mode="edit" /> },
          { path: "clients", element: <ClientsListPage /> },
          { path: "clients/create", element: <ClientFormPage mode="create" /> },
          { path: "clients/:id", element: <ClientDetailPage /> },
          { path: "clients/:id/edit", element: <ClientFormPage mode="edit" /> },
          { path: "reservations", element: <ReservationsListPage /> },
          { path: "reservations/create", element: <ReservationCreatePage /> },
          { path: "reservations/:id", element: <ReservationDetailPage /> },
          { path: "contracts", element: <ContractsListPage /> },
          { path: "contracts/create", element: <ContractCreatePage /> },
          { path: "contracts/:id", element: <ContractDetailPage /> },
          { path: "invoices", element: <InvoicesListPage /> },
          { path: "invoices/create", element: <InvoiceCreatePage /> },
          { path: "invoices/:id", element: <InvoiceDetailPage /> },
          { path: "payments", element: <PaymentsListPage /> },
          { path: "payments/:id", element: <PaymentDetailPage /> },
          { path: "deposits", element: <DepositsListPage /> },
          { path: "deposits/:id", element: <DepositDetailPage /> },
          { path: "expenses", element: <ExpensesListPage /> },
          { path: "expenses/create", element: <ExpenseFormPage mode="create" /> },
          { path: "expenses/:id", element: <ExpenseDetailPage /> },
          { path: "expenses/:id/edit", element: <ExpenseFormPage mode="edit" /> },
          { path: "maintenance", element: <MaintenanceListPage /> },
          { path: "maintenance/create", element: <MaintenanceCreatePage /> },
          { path: "maintenance/:id", element: <MaintenanceDetailPage /> },
          { path: "incidents", element: <IncidentsListPage /> },
          { path: "incidents/create", element: <IncidentCreatePage /> },
          { path: "incidents/:id", element: <IncidentDetailPage /> },
          { path: "reports/finance", element: <FinanceReportPage /> },
          { path: "reports/profit", element: <FinanceReportPage /> },
          { path: "reports/cars-profitability", element: <CarProfitabilityPage /> },
          { path: "reports/client-balances", element: <ClientBalancesPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
