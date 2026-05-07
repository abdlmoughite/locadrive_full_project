from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from clients.services import create_client_history_event
from finance.models import Deposit, Expense, FinancialTransaction, Invoice, InvoiceItem, Payment


ZERO = Decimal("0.00")
DEPOSIT_EXCLUDED_PAYMENT_TYPES = {Payment.Type.DEPOSIT, Payment.Type.DEPOSIT_REFUND}
DEPOSIT_EXCLUDED_TRANSACTION_TYPES = {
    FinancialTransaction.Type.DEPOSIT_HOLD,
    FinancialTransaction.Type.DEPOSIT_REFUND,
}


class FinanceService:
    PAYMENT_TO_TRANSACTION_TYPE = {
        Payment.Type.RENTAL_PAYMENT: FinancialTransaction.Type.RENTAL_REVENUE,
        Payment.Type.DEPOSIT: FinancialTransaction.Type.DEPOSIT_HOLD,
        Payment.Type.DEPOSIT_REFUND: FinancialTransaction.Type.DEPOSIT_REFUND,
        Payment.Type.DAMAGE_PAYMENT: FinancialTransaction.Type.DAMAGE_FEE,
        Payment.Type.LATE_FEE_PAYMENT: FinancialTransaction.Type.LATE_FEE,
        Payment.Type.FUEL_FEE_PAYMENT: FinancialTransaction.Type.FUEL_FEE,
        Payment.Type.EXPENSE_PAYMENT: FinancialTransaction.Type.EXPENSE,
    }

    INVOICE_TO_PAYMENT_TYPE = {
        Invoice.Type.RENTAL_INVOICE: Payment.Type.RENTAL_PAYMENT,
        Invoice.Type.DAMAGE_INVOICE: Payment.Type.DAMAGE_PAYMENT,
        Invoice.Type.LATE_FEE_INVOICE: Payment.Type.LATE_FEE_PAYMENT,
        Invoice.Type.FUEL_FEE_INVOICE: Payment.Type.FUEL_FEE_PAYMENT,
        Invoice.Type.SUBSCRIPTION_INVOICE: Payment.Type.EXPENSE_PAYMENT,
        Invoice.Type.EXPENSE_INVOICE: Payment.Type.EXPENSE_PAYMENT,
    }

    @staticmethod
    def generate_invoice_number(agency, issue_date=None):
        issue_date = issue_date or timezone.localdate()
        prefix = f"INV-{issue_date.year}-"
        latest_invoice = (
            Invoice.objects.filter(agency=agency, invoice_number__startswith=prefix)
            .order_by("-invoice_number")
            .first()
        )
        last_sequence = 0
        if latest_invoice:
            try:
                last_sequence = int(latest_invoice.invoice_number.split("-")[-1])
            except (TypeError, ValueError):
                last_sequence = 0
        return f"{prefix}{last_sequence + 1:06d}"

    @staticmethod
    def recalculate_invoice(invoice):
        subtotal = invoice.items.aggregate(total=Sum("total_price"))["total"] or ZERO
        invoice.subtotal = subtotal
        invoice.total_amount = subtotal - invoice.discount_amount + invoice.tax_amount
        invoice.remaining_amount = max(invoice.total_amount - invoice.paid_amount, ZERO)

        if invoice.status not in {Invoice.Status.CANCELLED, Invoice.Status.REFUNDED}:
            if invoice.remaining_amount <= ZERO:
                invoice.status = Invoice.Status.PAID
            elif invoice.paid_amount > ZERO:
                invoice.status = Invoice.Status.PARTIAL
            elif invoice.status == Invoice.Status.DRAFT:
                invoice.status = Invoice.Status.DRAFT
            else:
                invoice.status = Invoice.Status.UNPAID

        invoice.save(
            update_fields=[
                "subtotal",
                "total_amount",
                "remaining_amount",
                "status",
                "updated_at",
            ]
        )
        if invoice.contract_id:
            FinanceService.sync_contract_amounts(invoice.contract)
        if invoice.client_id:
            FinanceService.update_client_financials(invoice.client)
        return invoice

    @staticmethod
    def sync_contract_amounts(contract):
        paid_amount = (
            contract.invoices.exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED]).aggregate(
                total=Sum("paid_amount")
            )["total"]
            or ZERO
        )
        remaining_amount = (
            contract.invoices.exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED]).aggregate(
                total=Sum("remaining_amount")
            )["total"]
            or ZERO
        )
        contract.paid_amount = paid_amount
        contract.remaining_amount = remaining_amount
        contract.save(update_fields=["paid_amount", "remaining_amount", "updated_at"])
        return contract

    @staticmethod
    def update_client_financials(client):
        total_spent = (
            client.payments.filter(direction=Payment.Direction.INCOME, status=Payment.Status.PAID)
            .exclude(type__in=DEPOSIT_EXCLUDED_PAYMENT_TYPES)
            .aggregate(total=Sum("amount"))["total"]
            or ZERO
        )
        total_debt = (
            client.invoices.exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED])
            .exclude(type__in=[Invoice.Type.DEPOSIT_RECEIPT, Invoice.Type.DEPOSIT_REFUND])
            .aggregate(total=Sum("remaining_amount"))["total"]
            or ZERO
        )
        client.total_spent = total_spent
        client.total_debt = total_debt
        client.save(update_fields=["total_spent", "total_debt", "updated_at"])
        return client

    @staticmethod
    def create_financial_transaction(
        agency,
        transaction_type,
        direction,
        amount,
        created_by,
        payment_method="",
        description="",
        client=None,
        contract=None,
        car=None,
        invoice=None,
        expense=None,
        deposit=None,
        transaction_date=None,
    ):
        return FinancialTransaction.objects.create(
            agency=agency,
            client=client,
            contract=contract,
            car=car,
            invoice=invoice,
            expense=expense,
            deposit=deposit,
            type=transaction_type,
            direction=direction,
            amount=amount,
            payment_method=payment_method,
            description=description,
            transaction_date=transaction_date or timezone.now(),
            created_by=created_by,
        )

    @staticmethod
    @transaction.atomic
    def create_invoice_for_contract(contract, created_by):
        issue_date = timezone.localdate()
        invoice = Invoice.objects.create(
            agency=contract.agency,
            client=contract.client,
            contract=contract,
            car=contract.car,
            invoice_number=FinanceService.generate_invoice_number(contract.agency, issue_date),
            type=Invoice.Type.RENTAL_INVOICE,
            status=Invoice.Status.UNPAID,
            subtotal=contract.subtotal,
            discount_amount=contract.discount_amount,
            tax_amount=ZERO,
            total_amount=contract.total_amount,
            paid_amount=ZERO,
            remaining_amount=contract.total_amount,
            issue_date=issue_date,
            due_date=contract.start_date,
            notes=f"Rental contract invoice for {contract.contract_number}",
            created_by=created_by,
        )
        InvoiceItem.objects.create(
            agency=contract.agency,
            invoice=invoice,
            description=f"Rental for {contract.car.brand} {contract.car.model} ({contract.contract_number})",
            quantity=contract.days_count,
            unit_price=contract.daily_price,
            total_price=contract.subtotal,
        )
        FinanceService.recalculate_invoice(invoice)
        return invoice

    @staticmethod
    @transaction.atomic
    def create_adjustment_invoice(contract, invoice_type, amount, description, created_by):
        invoice = Invoice.objects.create(
            agency=contract.agency,
            client=contract.client,
            contract=contract,
            car=contract.car,
            invoice_number=FinanceService.generate_invoice_number(contract.agency),
            type=invoice_type,
            status=Invoice.Status.UNPAID,
            subtotal=amount,
            discount_amount=ZERO,
            tax_amount=ZERO,
            total_amount=amount,
            paid_amount=ZERO,
            remaining_amount=amount,
            issue_date=timezone.localdate(),
            due_date=timezone.localdate(),
            notes=description,
            created_by=created_by,
        )
        InvoiceItem.objects.create(
            agency=contract.agency,
            invoice=invoice,
            description=description,
            quantity=Decimal("1.00"),
            unit_price=amount,
            total_price=amount,
        )
        FinanceService.recalculate_invoice(invoice)
        create_client_history_event(
            client=contract.client,
            event_type="INVOICE",
            title=f"{invoice.get_type_display()} generated",
            description=description,
            created_by=created_by,
            reference_id=invoice.id,
        )
        return invoice

    @staticmethod
    @transaction.atomic
    def create_payment(
        *,
        agency,
        amount,
        method,
        payment_type,
        direction,
        created_by,
        client=None,
        contract=None,
        invoice=None,
        reference="",
        notes="",
        paid_at=None,
        status=Payment.Status.PAID,
        allow_overpay=False,
    ):
        if amount < ZERO:
            raise ValidationError({"amount": "Amount cannot be negative."})
        if invoice and invoice.status in {Invoice.Status.CANCELLED, Invoice.Status.REFUNDED}:
            raise ValidationError({"invoice": "Cannot pay a cancelled or refunded invoice."})
        if invoice and direction == Payment.Direction.INCOME and status == Payment.Status.PAID:
            if not allow_overpay and amount > invoice.remaining_amount:
                raise ValidationError({"amount": "Cannot pay more than the remaining invoice amount."})

        payment = Payment.objects.create(
            agency=agency,
            client=client,
            contract=contract,
            invoice=invoice,
            amount=amount,
            method=method,
            type=payment_type,
            direction=direction,
            status=status,
            paid_at=paid_at or timezone.now(),
            reference=reference,
            notes=notes,
            created_by=created_by,
        )

        if invoice and direction == Payment.Direction.INCOME and status == Payment.Status.PAID:
            invoice.paid_amount += amount
            invoice.remaining_amount = max(invoice.total_amount - invoice.paid_amount, ZERO)
            if invoice.remaining_amount <= ZERO:
                invoice.status = Invoice.Status.PAID
            elif invoice.paid_amount > ZERO:
                invoice.status = Invoice.Status.PARTIAL
            else:
                invoice.status = Invoice.Status.UNPAID
            invoice.save(update_fields=["paid_amount", "remaining_amount", "status", "updated_at"])

        transaction_type = FinanceService.PAYMENT_TO_TRANSACTION_TYPE[payment_type]
        FinanceService.create_financial_transaction(
            agency=agency,
            transaction_type=transaction_type,
            direction=direction,
            amount=amount,
            payment_method=method,
            description=notes or payment.get_type_display(),
            client=client,
            contract=contract,
            car=getattr(contract, "car", None) or getattr(invoice, "car", None),
            invoice=invoice,
            created_by=created_by,
            transaction_date=payment.paid_at,
        )

        if contract:
            FinanceService.sync_contract_amounts(contract)
        if client:
            FinanceService.update_client_financials(client)
            create_client_history_event(
                client=client,
                event_type="PAYMENT",
                title=f"Payment recorded: {payment.get_type_display()}",
                description=notes or reference,
                created_by=created_by,
                reference_id=payment.id,
            )
        return payment

    @staticmethod
    def pay_invoice(invoice, amount, method, created_by, reference="", notes="", allow_overpay=False):
        payment_type = FinanceService.INVOICE_TO_PAYMENT_TYPE.get(invoice.type, Payment.Type.RENTAL_PAYMENT)
        return FinanceService.create_payment(
            agency=invoice.agency,
            amount=amount,
            method=method,
            payment_type=payment_type,
            direction=Payment.Direction.INCOME,
            created_by=created_by,
            client=invoice.client,
            contract=invoice.contract,
            invoice=invoice,
            reference=reference,
            notes=notes,
            allow_overpay=allow_overpay,
        )

    @staticmethod
    @transaction.atomic
    def create_deposit(contract, amount, payment_method, created_by, notes=""):
        if amount < ZERO:
            raise ValidationError({"amount": "Amount cannot be negative."})
        deposit = Deposit.objects.create(
            agency=contract.agency,
            client=contract.client,
            contract=contract,
            car=contract.car,
            amount=amount,
            held_amount=amount,
            used_amount=ZERO,
            refunded_amount=ZERO,
            status=Deposit.Status.HELD,
            payment_method=payment_method,
            held_at=timezone.now(),
            notes=notes,
            created_by=created_by,
        )
        FinanceService.create_payment(
            agency=contract.agency,
            amount=amount,
            method=payment_method,
            payment_type=Payment.Type.DEPOSIT,
            direction=Payment.Direction.INCOME,
            created_by=created_by,
            client=contract.client,
            contract=contract,
            reference=f"DEP-{deposit.id}",
            notes=notes or "Deposit received",
        )
        create_client_history_event(
            client=contract.client,
            event_type="DEPOSIT",
            title="Deposit received",
            description=notes or f"Deposit of {amount} received.",
            created_by=created_by,
            reference_id=deposit.id,
        )
        return deposit

    @staticmethod
    @transaction.atomic
    def refund_deposit(deposit, amount, created_by, notes=""):
        if amount < ZERO:
            raise ValidationError({"amount": "Refund amount cannot be negative."})
        if amount > deposit.held_amount:
            raise ValidationError({"amount": "Cannot refund more than held amount."})

        deposit.refunded_amount += amount
        deposit.held_amount -= amount
        deposit.refunded_at = timezone.now()
        if deposit.held_amount <= ZERO:
            deposit.status = Deposit.Status.REFUNDED
        else:
            deposit.status = Deposit.Status.PARTIAL_REFUND
        deposit.save(update_fields=["refunded_amount", "held_amount", "refunded_at", "status", "updated_at"])

        FinanceService.create_payment(
            agency=deposit.agency,
            amount=amount,
            method=deposit.payment_method,
            payment_type=Payment.Type.DEPOSIT_REFUND,
            direction=Payment.Direction.OUTCOME,
            created_by=created_by,
            client=deposit.client,
            contract=deposit.contract,
            reference=f"DEP-REFUND-{deposit.id}",
            notes=notes or "Deposit refunded",
        )
        create_client_history_event(
            client=deposit.client,
            event_type="DEPOSIT",
            title="Deposit refunded",
            description=notes or f"Deposit refund of {amount} processed.",
            created_by=created_by,
            reference_id=deposit.id,
        )
        return deposit

    @staticmethod
    @transaction.atomic
    def use_deposit(deposit, amount, created_by, reason, invoice_type=Invoice.Type.DAMAGE_INVOICE):
        if amount < ZERO:
            raise ValidationError({"amount": "Used amount cannot be negative."})
        if amount > deposit.held_amount:
            raise ValidationError({"amount": "Cannot use more than held amount."})

        invoice = FinanceService.create_adjustment_invoice(
            contract=deposit.contract,
            invoice_type=invoice_type,
            amount=amount,
            description=reason,
            created_by=created_by,
        )
        payment_type = FinanceService.INVOICE_TO_PAYMENT_TYPE.get(invoice_type, Payment.Type.DAMAGE_PAYMENT)
        FinanceService.create_payment(
            agency=deposit.agency,
            amount=amount,
            method=deposit.payment_method,
            payment_type=payment_type,
            direction=Payment.Direction.INCOME,
            created_by=created_by,
            client=deposit.client,
            contract=deposit.contract,
            invoice=invoice,
            reference=f"DEP-USED-{deposit.id}",
            notes=reason,
            allow_overpay=False,
        )

        deposit.used_amount += amount
        deposit.held_amount -= amount
        deposit.status = Deposit.Status.USED if deposit.held_amount <= ZERO else Deposit.Status.HELD
        deposit.save(update_fields=["used_amount", "held_amount", "status", "updated_at"])
        create_client_history_event(
            client=deposit.client,
            event_type="DEPOSIT",
            title="Deposit used",
            description=reason,
            created_by=created_by,
            reference_id=deposit.id,
        )
        return deposit

    @staticmethod
    @transaction.atomic
    def create_expense(
        *,
        agency,
        category,
        title,
        amount,
        payment_method,
        created_by,
        description="",
        supplier_name="",
        expense_date=None,
        car=None,
        contract=None,
        invoice_file=None,
    ):
        if amount < ZERO:
            raise ValidationError({"amount": "Expense amount cannot be negative."})
        expense = Expense.objects.create(
            agency=agency,
            car=car,
            contract=contract,
            category=category,
            title=title,
            description=description,
            amount=amount,
            payment_method=payment_method,
            supplier_name=supplier_name,
            expense_date=expense_date or timezone.localdate(),
            invoice_file=invoice_file,
            created_by=created_by,
        )
        FinanceService.create_financial_transaction(
            agency=agency,
            transaction_type=FinancialTransaction.Type.EXPENSE,
            direction=FinancialTransaction.Direction.OUTCOME,
            amount=amount,
            payment_method=payment_method,
            description=title,
            car=car,
            contract=contract,
            expense=expense,
            created_by=created_by,
            transaction_date=timezone.now(),
        )
        return expense

    @staticmethod
    def calculate_profit(agency, start_date=None, end_date=None):
        revenue_qs = FinancialTransaction.objects.filter(
            agency=agency,
            direction=FinancialTransaction.Direction.INCOME,
        ).exclude(type__in=DEPOSIT_EXCLUDED_TRANSACTION_TYPES)
        expense_qs = FinancialTransaction.objects.filter(
            agency=agency,
            direction=FinancialTransaction.Direction.OUTCOME,
            type=FinancialTransaction.Type.EXPENSE,
        )

        if start_date:
            revenue_qs = revenue_qs.filter(transaction_date__date__gte=start_date)
            expense_qs = expense_qs.filter(transaction_date__date__gte=start_date)
        if end_date:
            revenue_qs = revenue_qs.filter(transaction_date__date__lte=end_date)
            expense_qs = expense_qs.filter(transaction_date__date__lte=end_date)

        total_revenue = revenue_qs.aggregate(total=Sum("amount"))["total"] or ZERO
        total_expenses = expense_qs.aggregate(total=Sum("amount"))["total"] or ZERO
        return {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_profit": total_revenue - total_expenses,
        }


generate_invoice_number = FinanceService.generate_invoice_number
create_invoice_for_contract = FinanceService.create_invoice_for_contract
create_payment = FinanceService.create_payment
pay_invoice = FinanceService.pay_invoice
create_deposit = FinanceService.create_deposit
refund_deposit = FinanceService.refund_deposit
use_deposit = FinanceService.use_deposit
create_expense = FinanceService.create_expense
calculate_profit = FinanceService.calculate_profit
create_financial_transaction = FinanceService.create_financial_transaction
