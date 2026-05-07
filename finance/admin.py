from django.contrib import admin

from finance.models import Deposit, Expense, FinancialTransaction, Invoice, InvoiceItem, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    exclude = ("agency",)
    readonly_fields = ("total_price",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "agency", "type", "status", "total_amount", "paid_amount", "remaining_amount", "issue_date")
    search_fields = ("invoice_number", "client__full_name", "contract__contract_number")
    list_filter = ("agency", "type", "status", "issue_date")
    inlines = [InvoiceItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("type", "direction", "agency", "client", "amount", "method", "status", "paid_at")
    search_fields = ("reference", "invoice__invoice_number", "client__full_name")
    list_filter = ("agency", "type", "direction", "method", "status", "paid_at")


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ("client", "contract", "car", "agency", "amount", "held_amount", "used_amount", "refunded_amount", "status")
    search_fields = ("client__full_name", "contract__contract_number", "car__plate_number")
    list_filter = ("agency", "status", "payment_method", "held_at")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "agency", "category", "amount", "payment_method", "expense_date")
    search_fields = ("title", "description", "supplier_name")
    list_filter = ("agency", "category", "expense_date", "payment_method")


@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ("type", "direction", "agency", "amount", "payment_method", "transaction_date", "created_by")
    search_fields = ("description", "client__full_name", "contract__contract_number", "car__plate_number")
    list_filter = ("agency", "type", "direction", "transaction_date")
