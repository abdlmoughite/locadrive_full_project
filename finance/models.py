from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from common.models import AgencyOwnedModel, TimeStampedModel, UUIDModel


class Invoice(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Type(models.TextChoices):
        RENTAL_INVOICE = "RENTAL_INVOICE", "Rental invoice"
        PAYMENT_RECEIPT = "PAYMENT_RECEIPT", "Payment receipt"
        DEPOSIT_RECEIPT = "DEPOSIT_RECEIPT", "Deposit receipt"
        DEPOSIT_REFUND = "DEPOSIT_REFUND", "Deposit refund"
        DAMAGE_INVOICE = "DAMAGE_INVOICE", "Damage invoice"
        LATE_FEE_INVOICE = "LATE_FEE_INVOICE", "Late fee invoice"
        FUEL_FEE_INVOICE = "FUEL_FEE_INVOICE", "Fuel fee invoice"
        EXPENSE_INVOICE = "EXPENSE_INVOICE", "Expense invoice"
        SUBSCRIPTION_INVOICE = "SUBSCRIPTION_INVOICE", "Subscription invoice"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        PARTIAL = "PARTIAL", "Partial"
        PAID = "PAID", "Paid"
        UNPAID = "UNPAID", "Unpaid"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"
        REFUNDED = "REFUNDED", "Refunded"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    contract = models.ForeignKey(
        "bookings.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    car = models.ForeignKey(
        "fleet.Car",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    invoice_number = models.CharField(max_length=32)
    type = models.CharField(max_length=30, choices=Type.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    issue_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices_created",
    )

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["agency", "invoice_number"], name="unique_invoice_number_per_agency")
        ]

    def __str__(self) -> str:
        return self.invoice_number


class InvoiceItem(UUIDModel, AgencyOwnedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["invoice__invoice_number"]

    def clean(self) -> None:
        if self.invoice_id:
            if self.agency_id and self.agency_id != self.invoice.agency_id:
                raise ValidationError({"agency": "Invoice item agency must match the parent invoice agency."})
            self.agency = self.invoice.agency

    def save(self, *args, **kwargs):
        if self.invoice_id:
            self.agency = self.invoice.agency
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.invoice.invoice_number} - {self.description}"


class Payment(UUIDModel, AgencyOwnedModel):
    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank transfer"
        CHEQUE = "CHEQUE", "Cheque"
        ONLINE = "ONLINE", "Online"

    class Type(models.TextChoices):
        RENTAL_PAYMENT = "RENTAL_PAYMENT", "Rental payment"
        DEPOSIT = "DEPOSIT", "Deposit"
        DEPOSIT_REFUND = "DEPOSIT_REFUND", "Deposit refund"
        DAMAGE_PAYMENT = "DAMAGE_PAYMENT", "Damage payment"
        LATE_FEE_PAYMENT = "LATE_FEE_PAYMENT", "Late fee payment"
        FUEL_FEE_PAYMENT = "FUEL_FEE_PAYMENT", "Fuel fee payment"
        EXPENSE_PAYMENT = "EXPENSE_PAYMENT", "Expense payment"

    class Direction(models.TextChoices):
        INCOME = "INCOME", "Income"
        OUTCOME = "OUTCOME", "Outcome"

    class Status(models.TextChoices):
        PAID = "PAID", "Paid"
        PENDING = "PENDING", "Pending"
        CANCELLED = "CANCELLED", "Cancelled"
        REFUNDED = "REFUNDED", "Refunded"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    contract = models.ForeignKey(
        "bookings.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    method = models.CharField(max_length=20, choices=Method.choices)
    type = models.CharField(max_length=30, choices=Type.choices)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    paid_at = models.DateTimeField()
    reference = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at", "-created_at"]

    def __str__(self) -> str:
        return f"{self.type} - {self.amount}"


class Deposit(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Status(models.TextChoices):
        HELD = "HELD", "Held"
        PARTIAL_REFUND = "PARTIAL_REFUND", "Partial refund"
        REFUNDED = "REFUNDED", "Refunded"
        USED = "USED", "Used"
        CANCELLED = "CANCELLED", "Cancelled"

    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="deposits")
    contract = models.ForeignKey("bookings.Contract", on_delete=models.CASCADE, related_name="deposits")
    car = models.ForeignKey("fleet.Car", on_delete=models.CASCADE, related_name="deposits")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    held_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    used_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HELD)
    payment_method = models.CharField(max_length=20, choices=Payment.Method.choices)
    held_at = models.DateTimeField()
    refunded_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deposits_created",
    )

    class Meta:
        ordering = ["-held_at", "-created_at"]

    def __str__(self) -> str:
        return f"Deposit - {self.client.full_name}"


class Expense(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Category(models.TextChoices):
        CAR_MAINTENANCE = "CAR_MAINTENANCE", "Car maintenance"
        CAR_REPAIR = "CAR_REPAIR", "Car repair"
        INSURANCE = "INSURANCE", "Insurance"
        TECHNICAL_VISIT = "TECHNICAL_VISIT", "Technical visit"
        RENT_OFFICE = "RENT_OFFICE", "Rent office"
        SALARY = "SALARY", "Salary"
        FUEL = "FUEL", "Fuel"
        CLEANING = "CLEANING", "Cleaning"
        MARKETING = "MARKETING", "Marketing"
        SOFTWARE = "SOFTWARE", "Software"
        TAX = "TAX", "Tax"
        OTHER = "OTHER", "Other"

    car = models.ForeignKey(
        "fleet.Car",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    contract = models.ForeignKey(
        "bookings.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    category = models.CharField(max_length=30, choices=Category.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    payment_method = models.CharField(max_length=20, choices=Payment.Method.choices)
    supplier_name = models.CharField(max_length=255, blank=True)
    expense_date = models.DateField()
    invoice_file = models.FileField(upload_to="finance/expenses/", null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses_created",
    )

    class Meta:
        ordering = ["-expense_date", "-created_at"]

    def __str__(self) -> str:
        return self.title


class FinancialTransaction(UUIDModel, AgencyOwnedModel):
    class Type(models.TextChoices):
        RENTAL_REVENUE = "RENTAL_REVENUE", "Rental revenue"
        DEPOSIT_HOLD = "DEPOSIT_HOLD", "Deposit hold"
        DEPOSIT_REFUND = "DEPOSIT_REFUND", "Deposit refund"
        DEPOSIT_USAGE = "DEPOSIT_USAGE", "Deposit usage"
        DAMAGE_FEE = "DAMAGE_FEE", "Damage fee"
        LATE_FEE = "LATE_FEE", "Late fee"
        FUEL_FEE = "FUEL_FEE", "Fuel fee"
        EXPENSE = "EXPENSE", "Expense"
        SUBSCRIPTION = "SUBSCRIPTION", "Subscription"
        OTHER = "OTHER", "Other"

    class Direction(models.TextChoices):
        INCOME = "INCOME", "Income"
        OUTCOME = "OUTCOME", "Outcome"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    contract = models.ForeignKey(
        "bookings.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    car = models.ForeignKey(
        "fleet.Car",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    expense = models.ForeignKey(
        Expense,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    deposit = models.ForeignKey(
        Deposit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions",
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    payment_method = models.CharField(max_length=20, choices=Payment.Method.choices, blank=True)
    description = models.TextField(blank=True)
    transaction_date = models.DateTimeField()
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_transactions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.type} - {self.amount}"
