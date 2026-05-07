import { z } from "zod";

const moneyField = z.coerce.number().min(0, "Value cannot be negative.");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const ownerSignupSchema = z
  .object({
    first_name: z.string().min(2, "First name is required."),
    last_name: z.string().min(2, "Last name is required."),
    email: z.string().email("Enter a valid email address."),
    phone: z.string().min(8, "Agency phone is required."),
    agency_name: z.string().min(2, "Agency name is required."),
    agency_city: z.string().optional(),
    agency_address: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });

export const carSchema = z.object({
  brand: z.string().min(1, "Brand is required."),
  model: z.string().min(1, "Model is required."),
  plate_number: z.string().min(1, "Plate number is required."),
  year: z.coerce.number().min(1900).max(3000),
  color: z.string().optional(),
  fuel_type: z.string().min(1),
  transmission: z.string().min(1),
  daily_price: moneyField,
  deposit_amount: moneyField,
  mileage: z.coerce.number().min(0),
  status: z.string().min(1),
});

export const clientSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  phone: z.string().min(3, "Phone is required."),
  email: z.email().or(z.literal("")),
  cin: z.string().optional(),
  passport: z.string().optional(),
  driving_license: z.string().optional(),
  address: z.string().optional(),
  birth_date: z.string().optional(),
});

export const reservationSchema = z
  .object({
    client_mode: z.enum(["existing", "new"]),
    client: z.string().optional(),
    new_client: z.object({
      full_name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("Enter a valid email address.").or(z.literal("")).optional(),
      cin: z.string().optional(),
      passport: z.string().optional(),
      driving_license: z.string().optional(),
      address: z.string().optional(),
      birth_date: z.string().optional(),
    }),
    car: z.string().min(1, "Car is required."),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().min(1, "End date is required."),
    advance_amount: moneyField,
  })
  .refine((values) => new Date(values.end_date) > new Date(values.start_date), {
    path: ["end_date"],
    message: "End date must be after start date.",
  })
  .refine((values) => {
    if (values.client_mode === "existing") {
      return Boolean(values.client?.trim());
    }
    return Boolean(values.new_client.full_name?.trim()) && Boolean(values.new_client.phone?.trim());
  }, {
    path: ["client"],
    message: "Choose an existing client or provide a new client name and phone number.",
  });

export const contractSchema = z
  .object({
    client: z.string().min(1, "Client is required."),
    car: z.string().min(1, "Car is required."),
    start_date: z.string().min(1, "Start date is required."),
    expected_return_date: z.string().min(1, "Expected return date is required."),
    daily_price: moneyField,
    discount_amount: moneyField,
    extra_fees: moneyField,
    start_mileage: z.coerce.number().min(0),
    start_fuel_level: z.coerce.number().min(0).max(100),
    blacklist_override_reason: z.string().optional(),
    client_blacklisted: z.boolean().default(false),
    can_override: z.boolean().default(false),
  })
  .refine((values) => new Date(values.expected_return_date) > new Date(values.start_date), {
    path: ["expected_return_date"],
    message: "Expected return date must be after start date.",
  })
  .refine(
    (values) => {
      if (values.client_blacklisted && values.can_override) {
        return Boolean(values.blacklist_override_reason?.trim());
      }
      return true;
    },
    {
      path: ["blacklist_override_reason"],
      message: "Override reason is required for blacklisted clients.",
    },
  );

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: moneyField,
  unit_price: moneyField,
});

export const invoiceSchema = z.object({
  client: z.string().optional(),
  contract: z.string().optional(),
  type: z.string().min(1, "Invoice type is required."),
  issue_date: z.string().min(1, "Issue date is required."),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required."),
});

export const paymentSchema = z.object({
  client: z.string().optional(),
  contract: z.string().optional(),
  invoice: z.string().optional(),
  amount: moneyField,
  method: z.string().min(1, "Payment method is required."),
  type: z.string().min(1, "Payment type is required."),
  direction: z.string().min(1, "Payment direction is required."),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

export const depositSchema = z.object({
  amount: moneyField,
  payment_method: z.string().min(1, "Payment method is required."),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1, "Category is required."),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  amount: moneyField,
  payment_method: z.string().min(1, "Payment method is required."),
  supplier_name: z.string().optional(),
  expense_date: z.string().min(1, "Expense date is required."),
  car: z.string().optional(),
  contract: z.string().optional(),
});

export const maintenanceSchema = z.object({
  car: z.string().min(1, "Car is required."),
  type: z.string().min(1, "Type is required."),
  description: z.string().optional(),
  cost: moneyField,
  started_at: z.string().min(1, "Start date & time is required."),
  estimated_duration_hours: moneyField,
  status: z.string().min(1, "Status is required."),
});

export const incidentSchema = z.object({
  client: z.string().optional(),
  car: z.string().optional(),
  contract: z.string().optional(),
  type: z.string().min(1, "Type is required."),
  description: z.string().min(1, "Description is required."),
  amount: moneyField,
  status: z.string().min(1, "Status is required."),
});

export const depositRefundSchema = z.object({
  amount: moneyField,
  notes: z.string().optional(),
  held_amount: moneyField,
}).refine((values) => values.amount <= values.held_amount, {
  path: ["amount"],
  message: "Refund amount cannot exceed held amount.",
});

export const depositUseSchema = z.object({
  amount: moneyField,
  reason: z.string().min(1, "Reason is required."),
  invoice_type: z.string().optional(),
  held_amount: moneyField,
}).refine((values) => values.amount <= values.held_amount, {
  path: ["amount"],
  message: "Used amount cannot exceed held amount.",
});

export const contractCompletionSchema = z.object({
  actual_return_date: z.string().min(1, "Actual return date is required."),
  return_mileage: z.coerce.number().min(0),
  return_fuel_level: z.coerce.number().min(0).max(100),
  late_fee: moneyField,
  damage_fee: moneyField,
  fuel_fee: moneyField,
  maintenance_required: z.boolean().default(false),
});
