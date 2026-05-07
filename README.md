# LocaDrive SaaS Backend

Multi-tenant Django REST API for car rental agencies. Agencies are the tenants, users belong to agencies, and clients are managed as records inside an agency without authentication.

## Stack

- Python 3.12+
- Django
- Django REST Framework
- PostgreSQL
- JWT with `djangorestframework-simplejwt`
- `django-filter`
- `drf-spectacular`
- `django-environ`
- `django-cors-headers`

## Apps

- `accounts`: custom user model, JWT auth, role-based user management
- `agencies`: agencies and subscriptions
- `fleet`: cars, car documents, car history, availability
- `clients`: client records, notes, blacklist logs, client history
- `bookings`: reservations and rental contracts
- `finance`: invoices, payments, deposits, expenses, financial transactions
- `maintenance`: maintenance records and incidents
- `reports`: dashboard and finance reports
- `common`: base models, permissions, pagination, shared helpers

## Core Features

- UUID primary keys on all models
- Agency-based tenancy isolation
- Superadmin cross-tenant access
- Agency owner and agent role separation
- Email-based authentication with JWT
- Automatic contract numbering and invoice numbering
- Reservation and contract overlap protection
- Blacklist enforcement with owner override
- Deposit tracking excluded from profit until settlement use
- Financial transaction ledger for reports
- OpenAPI schema and Swagger UI

## Setup

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. Configure environment variables:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your PostgreSQL credentials.

4. Run migrations:

```powershell
python manage.py makemigrations
python manage.py migrate
```

Optional: load realistic Moroccan demo data for the full SaaS flow:

```powershell
python manage.py seed_demo_data --clear
```

5. Create a superuser:

```powershell
python manage.py createsuperuser
```

6. Start the development server:

```powershell
python manage.py runserver
```

7. Open the API docs:

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI schema: `http://127.0.0.1:8000/api/schema/`

## Authentication

- Login: `POST /api/auth/login/`
- Refresh: `POST /api/auth/refresh/`
- Logout: `POST /api/auth/logout/`
- Current user: `GET /api/auth/me/`
- Agency owner registration: `POST /api/auth/register/owner/`

Use the `Authorization: Bearer <access_token>` header for authenticated requests.

Newly registered agency owners are created with pending verification by default. They can log in and access `/api/auth/me/`, but protected agency modules remain blocked until support or an admin verifies the account.

## Important Business Rules

- All agency-owned resources are scoped by `agency`.
- Superadmins can work across all agencies.
- Agency owners can manage their agency and create agents.
- Agents cannot override blacklist decisions or delete sensitive finance data.
- Blacklisted clients cannot receive contracts unless an owner or superadmin provides an override reason.
- Cars in maintenance or out-of-service cannot be booked.
- Overlapping reservations or active contracts for the same car are blocked.
- Creating a contract automatically creates a rental invoice.
- Deposit holds are tracked but excluded from profit.
- Expenses reduce net profit through financial transactions.

## Reports

- `GET /api/reports/dashboard/`
- `GET /api/reports/finance-summary/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /api/reports/car-profitability/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /api/reports/client-balances/`

Superadmins should pass an `agency` query parameter to report endpoints.

## Testing

Run the test suite with:

```powershell
python manage.py test
```

The included tests cover:

- agency data isolation
- login
- owner creates agent
- duplicate client detection
- blacklist contract blocking
- owner override
- double booking prevention
- invoice generation on contract creation
- invoice payment status updates
- deposit exclusion from profit
- expense impact on profit
- client history event creation
