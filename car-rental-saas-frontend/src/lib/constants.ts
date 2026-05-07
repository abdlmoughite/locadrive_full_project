import type {
  CarStatus,
  ClientStatus,
  ContractStatus,
  DepositStatus,
  ExpenseCategory,
  InvoiceStatus,
  InvoiceType,
  PaymentDirection,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ReservationStatus,
  UserRole,
} from "@/types/common";

export const userRoles: UserRole[] = ["SUPERADMIN", "AGENCY_OWNER", "AGENCY_AGENT"];
export const carStatuses: CarStatus[] = ["AVAILABLE", "RESERVED", "RENTED", "MAINTENANCE", "OUT_OF_SERVICE"];
export const fuelTypes = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "GAS", "OTHER"] as const;
export const transmissionTypes = ["MANUAL", "AUTOMATIC", "SEMI_AUTOMATIC"] as const;
export const clientStatuses: ClientStatus[] = ["ACTIVE", "WARNING", "BLACKLISTED"];
export const reservationStatuses: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "CONVERTED_TO_CONTRACT",
];
export const contractStatuses: ContractStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "OVERDUE", "CANCELLED"];
export const maintenanceStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const incidentStatuses = ["OPEN", "PAID", "RESOLVED", "CANCELLED"] as const;
export const incidentTypes = ["ACCIDENT", "DAMAGE", "FINE", "LATE_RETURN", "OTHER"] as const;
export const invoiceStatuses: InvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "PARTIAL",
  "PAID",
  "UNPAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
];
export const invoiceTypes: InvoiceType[] = [
  "RENTAL_INVOICE",
  "PAYMENT_RECEIPT",
  "DEPOSIT_RECEIPT",
  "DEPOSIT_REFUND",
  "DAMAGE_INVOICE",
  "LATE_FEE_INVOICE",
  "FUEL_FEE_INVOICE",
  "EXPENSE_INVOICE",
  "SUBSCRIPTION_INVOICE",
];
export const paymentMethods: PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"];
export const paymentStatuses: PaymentStatus[] = ["PAID", "PENDING", "CANCELLED", "REFUNDED"];
export const paymentTypes: PaymentType[] = [
  "RENTAL_PAYMENT",
  "DEPOSIT",
  "DEPOSIT_REFUND",
  "DAMAGE_PAYMENT",
  "LATE_FEE_PAYMENT",
  "FUEL_FEE_PAYMENT",
  "EXPENSE_PAYMENT",
];
export const paymentDirections: PaymentDirection[] = ["INCOME", "OUTCOME"];
export const depositStatuses: DepositStatus[] = ["HELD", "PARTIAL_REFUND", "REFUNDED", "USED", "CANCELLED"];
export const expenseCategories: ExpenseCategory[] = [
  "CAR_MAINTENANCE",
  "CAR_REPAIR",
  "INSURANCE",
  "TECHNICAL_VISIT",
  "RENT_OFFICE",
  "SALARY",
  "FUEL",
  "CLEANING",
  "MARKETING",
  "SOFTWARE",
  "TAX",
  "OTHER",
];

export const pageSize = 10;

export const statusVariantMap: Record<string, string> = {
  ACTIVE: "success",
  AVAILABLE: "success",
  PAID: "success",
  REFUNDED: "success",
  RESOLVED: "success",
  COMPLETED: "success",
  CONFIRMED: "success",
  HELD: "info",
  DRAFT: "neutral",
  PENDING: "warning",
  PARTIAL: "warning",
  PARTIAL_REFUND: "warning",
  WARNING: "warning",
  OVERDUE: "danger",
  BLACKLISTED: "danger",
  OUT_OF_SERVICE: "danger",
  CANCELLED: "danger",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
  RESERVED: "info",
  RENTED: "info",
  MAINTENANCE: "warning",
  OPEN: "warning",
  UNPAID: "danger",
  ISSUED: "info",
  EXPIRED: "danger",
  PAST_DUE: "warning",
  USED: "warning",
  DAMAGE: "danger",
  FINE: "warning",
  LATE_RETURN: "warning",
  ACCIDENT: "danger",
};
