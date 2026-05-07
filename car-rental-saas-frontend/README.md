# car-rental-saas-frontend

React + TypeScript + Vite frontend for the `LocaDrive_saas` multi-tenant car rental management platform.

This dashboard is built for rental agencies and SaaS admins only.
Clients are records inside an agency. Clients do not log in and there is no client portal.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Lucide React
- Reusable Tailwind UI components

## Features

- JWT authentication with access + refresh token handling
- Axios request and response interceptors
- Automatic `/api/auth/refresh/` retry on expired access tokens
- Agency owner self-signup with pending verification flow
- Protected routes with role-aware navigation
- Superadmin pages for agencies, subscriptions, and global users
- Agency dashboard for cars, clients, reservations, contracts, finance, maintenance, incidents, and reports
- Multi-tenant-safe UI: agency users never choose `agency_id` manually
- Blacklist warnings and owner override support in contract creation
- Deposit tracking separated from revenue and profit visuals
- Responsive SaaS layout with sidebar, topbar, cards, tables, filters, and charts

## Project Structure

```text
src/
  app/
    router.tsx
    providers.tsx
  components/
    charts/
    common/
    forms/
    layout/
    route/
    tables/
    ui/
  config/
    env.ts
    navigation.ts
    permissions.ts
  features/
    agencies/
    auth/
    cars/
    clients/
    contracts/
    dashboard/
    deposits/
    expenses/
    incidents/
    invoices/
    maintenance/
    payments/
    reports/
    reservations/
    users/
  hooks/
  lib/
  types/
```

## Environment Variables

Create a `.env` file from `.env.example`.

```bash
Copy-Item .env.example .env
```

Required variable:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Install

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

The app will usually be available at:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

Verified locally on this project with Node `20.17.0` after pinning Vite to a Node-compatible version.

## Auth Flow

1. User signs in from `/login` with email and password.
2. New agency owners can register from `/register`.
3. Newly registered agency owners are marked as pending verification.
4. Pending owners can authenticate, but the frontend redirects them to `/pending-verification`.
5. Verified users continue to the dashboard normally.
6. Frontend stores access and refresh tokens in local storage.
7. Axios adds `Authorization: Bearer <access>` automatically.
8. On `401`, Axios attempts `/api/auth/refresh/`.
9. If refresh succeeds, the original request is retried.
10. On logout, the frontend posts the refresh token to `/api/auth/logout/`, then clears local auth state.
11. If refresh fails, tokens are cleared and the user is redirected to `/login`.
12. `/api/auth/me/` hydrates the current user session and role context.

## Roles

`SUPERADMIN`
- Dashboard
- Agencies
- Subscriptions
- Global users

`AGENCY_OWNER`
- Dashboard
- Cars
- Clients
- Reservations
- Contracts
- Invoices
- Payments
- Deposits
- Expenses
- Maintenance
- Incidents
- Reports
- Agency users
- Settings
- Blacklist override allowed

`AGENCY_AGENT`
- Dashboard
- Cars
- Clients
- Reservations
- Contracts
- Payments
- Deposits
- Maintenance
- Incidents
- Cannot manage subscriptions
- Cannot override blacklist
- Cannot delete sensitive finance records

## Main Routes

Public:

- `/login`
- `/register`
- `/pending-verification`

Shared protected:

- `/dashboard`
- `/profile`

Superadmin:

- `/admin/agencies`
- `/admin/agencies/:id`
- `/admin/subscriptions`
- `/admin/users`

Agency:

- `/cars`
- `/clients`
- `/reservations`
- `/contracts`
- `/invoices`
- `/payments`
- `/deposits`
- `/expenses`
- `/maintenance`
- `/incidents`
- `/reports/finance`
- `/reports/profit`
- `/reports/cars-profitability`
- `/reports/client-balances`
- `/users`
- `/settings`

## Notes

- Deposit / Daman is shown separately from revenue and profit.
- Contract and reservation forms use the backend availability endpoint to prevent selecting unavailable cars.
- Blacklisted clients are visually flagged across the UI.
- Owner override for blacklisted clients is supported only where the backend allows it.
- Pending verification support phone shown in the app: `0665113076`
- The production build currently emits a bundle-size warning because the app ships many dashboard screens and chart dependencies in one chunk. The app still builds successfully.
