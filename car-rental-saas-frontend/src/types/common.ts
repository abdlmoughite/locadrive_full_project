export type UUID = string;

export type Nullable<T> = T | null;

export interface AgencySummary {
  id: UUID;
  name: string;
}

export interface AuditFields {
  created_at: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface QueryListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export type UserRole = "SUPERADMIN" | "AGENCY_OWNER" | "AGENCY_AGENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type VerificationStatus = "VERIFIED" | "PENDING";

export interface User extends AuditFields {
  id: UUID;
  agency: AgencySummary | UUID | null;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_verified: boolean;
  verification_status: VerificationStatus;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface Agency extends AuditFields {
  id: UUID;
  name: string;
  phone: string;
  email: string;
  address: string;
  logo: string | null;
  subscription_status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE";
}

export interface Subscription extends AuditFields {
  id: UUID;
  agency: UUID;
  plan_name: string;
  price: string;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE";
}

export type CarStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "RENTED"
  | "MAINTENANCE"
  | "OUT_OF_SERVICE";

export interface Car extends AuditFields {
  id: UUID;
  agency: UUID;
  brand: string;
  model: string;
  plate_number: string;
  year: number;
  color: string;
  fuel_type: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "GAS" | "OTHER";
  transmission: "MANUAL" | "AUTOMATIC" | "SEMI_AUTOMATIC";
  daily_price: string;
  deposit_amount: string;
  mileage: number;
  status: CarStatus;
  is_active: boolean;
}

export interface CarDocument {
  id: UUID;
  agency: UUID;
  car: UUID;
  type: string;
  file: string;
  expiry_date: string | null;
  created_at: string;
}

export interface CarHistoryEvent {
  id: UUID;
  agency: UUID;
  car: UUID;
  created_by: UUID | null;
  created_by_name?: string;
  event_type: string;
  title: string;
  description: string;
  reference_id: UUID | null;
  created_at: string;
}

export type ClientStatus = "ACTIVE" | "WARNING" | "BLACKLISTED";

export interface Client extends AuditFields {
  id: UUID;
  agency: UUID;
  full_name: string;
  phone: string;
  email: string;
  cin: string;
  passport: string;
  driving_license: string;
  address: string;
  birth_date: string | null;
  status: ClientStatus;
  blacklisted: boolean;
  blacklist_reason: string;
  blacklist_note: string;
  blacklisted_at: string | null;
  blacklisted_by: UUID | null;
  total_spent: string;
  total_debt: string;
  total_contracts: number;
  last_rental_date: string | null;
}

export interface ClientNote {
  id: UUID;
  agency: UUID;
  client: UUID;
  note: string;
  created_by: UUID | null;
  created_at: string;
}

export interface ClientHistoryEvent {
  id: UUID;
  agency: UUID;
  client: UUID;
  created_by: UUID | null;
  created_by_name?: string;
  event_type: string;
  title: string;
  description: string;
  reference_id: UUID | null;
  created_at: string;
}

export interface ClientBlacklistLog {
  id: UUID;
  agency: UUID;
  client: UUID;
  action:
    | "WARNING_ADDED"
    | "WARNING_REMOVED"
    | "BLACKLISTED"
    | "UNBLACKLISTED"
    | "OVERRIDDEN";
  reason: string;
  note: string;
  created_by: UUID | null;
  created_by_name?: string;
  created_at: string;
}

export interface DuplicateCheckResponse {
  exists: boolean;
  matches: Record<
    string,
    Array<{
      id: UUID;
      full_name: string;
      phone: string;
      email: string;
      cin: string;
      passport: string;
      driving_license: string;
    }>
  >;
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "CONVERTED_TO_CONTRACT";

export interface Reservation extends AuditFields {
  id: UUID;
  agency: UUID;
  client: UUID;
  car: UUID;
  start_date: string;
  end_date: string;
  estimated_total: string;
  advance_amount: string;
  status: ReservationStatus;
  created_by: UUID | null;
}

export type ContractStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "OVERDUE"
  | "CANCELLED";

export interface Contract extends AuditFields {
  id: UUID;
  agency: UUID;
  client: UUID;
  car: UUID;
  reservation: UUID | null;
  contract_number: string;
  start_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  daily_price: string;
  days_count: number;
  subtotal: string;
  extra_fees: string;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  start_mileage: number;
  return_mileage: number | null;
  start_fuel_level: string;
  return_fuel_level: string | null;
  status: ContractStatus;
  blacklist_override: boolean;
  blacklist_override_reason: string;
  created_by: UUID | null;
}

export interface ContractFinancialSummary {
  contract_number: string;
  total_invoiced: string;
  total_paid: string;
  total_due: string;
  deposits_held: string;
}

export type InvoiceType =
  | "RENTAL_INVOICE"
  | "PAYMENT_RECEIPT"
  | "DEPOSIT_RECEIPT"
  | "DEPOSIT_REFUND"
  | "DAMAGE_INVOICE"
  | "LATE_FEE_INVOICE"
  | "FUEL_FEE_INVOICE"
  | "EXPENSE_INVOICE"
  | "SUBSCRIPTION_INVOICE";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIAL"
  | "PAID"
  | "UNPAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED";

export interface InvoiceItem {
  id: UUID;
  description: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

export interface Invoice extends AuditFields {
  id: UUID;
  agency: UUID;
  client: UUID | null;
  contract: UUID | null;
  car: UUID | null;
  invoice_number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  issue_date: string;
  due_date: string | null;
  notes: string;
  items: InvoiceItem[];
}

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";
export type PaymentType =
  | "RENTAL_PAYMENT"
  | "DEPOSIT"
  | "DEPOSIT_REFUND"
  | "DAMAGE_PAYMENT"
  | "LATE_FEE_PAYMENT"
  | "FUEL_FEE_PAYMENT"
  | "EXPENSE_PAYMENT";
export type PaymentDirection = "INCOME" | "OUTCOME";
export type PaymentStatus = "PAID" | "PENDING" | "CANCELLED" | "REFUNDED";

export interface Payment {
  id: UUID;
  agency: UUID;
  client: UUID | null;
  contract: UUID | null;
  invoice: UUID | null;
  amount: string;
  method: PaymentMethod;
  type: PaymentType;
  direction: PaymentDirection;
  status: PaymentStatus;
  paid_at: string;
  reference: string;
  notes: string;
  created_by?: UUID | null;
  created_at: string;
}

export type DepositStatus = "HELD" | "PARTIAL_REFUND" | "REFUNDED" | "USED" | "CANCELLED";

export interface Deposit extends AuditFields {
  id: UUID;
  agency: UUID;
  client: UUID;
  contract: UUID;
  car: UUID;
  amount: string;
  held_amount: string;
  used_amount: string;
  refunded_amount: string;
  status: DepositStatus;
  payment_method: PaymentMethod;
  held_at: string;
  refunded_at: string | null;
  notes: string;
}

export type ExpenseCategory =
  | "CAR_MAINTENANCE"
  | "CAR_REPAIR"
  | "INSURANCE"
  | "TECHNICAL_VISIT"
  | "RENT_OFFICE"
  | "SALARY"
  | "FUEL"
  | "CLEANING"
  | "MARKETING"
  | "SOFTWARE"
  | "TAX"
  | "OTHER";

export interface Expense extends AuditFields {
  id: UUID;
  agency: UUID;
  car: UUID | null;
  contract: UUID | null;
  category: ExpenseCategory;
  title: string;
  description: string;
  amount: string;
  payment_method: PaymentMethod;
  supplier_name: string;
  expense_date: string;
  invoice_file: string | null;
}

export interface Maintenance extends AuditFields {
  id: UUID;
  agency: UUID;
  car: UUID;
  type: string;
  description: string;
  cost: string;
  started_at: string;
  estimated_duration_hours: string;
  estimated_end_at?: string | null;
  maintenance_date: string;
  next_maintenance_date: string | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  created_by: UUID | null;
}

export interface Incident extends AuditFields {
  id: UUID;
  agency: UUID;
  contract: UUID | null;
  client: UUID | null;
  car: UUID | null;
  type: "ACCIDENT" | "DAMAGE" | "FINE" | "LATE_RETURN" | "OTHER";
  description: string;
  amount: string;
  status: "OPEN" | "PAID" | "RESOLVED" | "CANCELLED";
  created_by: UUID | null;
}

export interface DashboardRecentReservation {
  id: UUID;
  status: ReservationStatus;
  start_date: string;
  end_date: string;
  estimated_total: string;
  client__full_name: string;
  car__brand: string;
  car__model: string;
  car__plate_number: string;
}

export interface DashboardSummary {
  total_cars: number;
  active_cars: number;
  inactive_cars: number;
  cars_available: number;
  cars_rented: number;
  cars_maintenance: number;
  active_reservations: number;
  active_contracts: number;
  reservations_today: number;
  returns_today: number;
  total_clients: number;
  revenue_today: string;
  revenue_this_month: string;
  expenses_this_month: string;
  net_profit_this_month: string;
  deposits_held: string;
  client_debts: string;
  unpaid_invoices: number;
  recent_reservations: DashboardRecentReservation[];
}

export interface FinanceSummaryReport {
  total_revenue: string;
  total_expenses: string;
  net_profit: string;
  deposits_received: string;
  deposits_refunded: string;
  deposits_currently_held: string;
  unpaid_invoices: string;
  client_debts: string;
}

export interface CarProfitabilityRow {
  car: {
    id: UUID;
    label: string;
    plate_number: string;
  };
  rental_revenue: string;
  extra_fees: string;
  total_revenue: string;
  expenses: string;
  net_profit: string;
  contracts_count: number;
}

export interface ClientBalanceRow {
  client: {
    id: UUID;
    full_name: string;
    phone: string;
  };
  total_paid: string;
  total_unpaid: string;
  total_debt: string;
  active_deposit: string;
  blacklist_status: ClientStatus;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: User;
}

export interface RefreshResponse {
  access: string;
  refresh?: string;
}

export interface ApiErrorPayload {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: string | string[] | undefined;
}

export interface OwnerRegistrationPayload {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  agency_name: string;
  agency_phone: string;
  agency_address?: string;
  agency_city?: string;
}

export interface CarChoicesResponse {
  fuel_type: SelectOption[];
  transmission: SelectOption[];
  status: SelectOption[];
}
