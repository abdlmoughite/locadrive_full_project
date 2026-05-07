from decimal import Decimal

from finance.models import Expense, Invoice, Payment
from finance.services import FinanceService
from common.test_helpers import BaseAPITestCase


class FinanceWorkflowTests(BaseAPITestCase):
    def test_payment_updates_invoice_status(self):
        contract = self.create_contract()
        invoice = contract.invoices.first()
        self.authenticate(self.owner)

        response = self.client.post(
            f"/api/invoices/{invoice.id}/pay/",
            {
                "amount": str(invoice.total_amount),
                "method": Payment.Method.CASH,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
        self.assertEqual(invoice.remaining_amount, Decimal("0.00"))

    def test_deposit_received_is_not_counted_as_profit(self):
        contract = self.create_contract()
        FinanceService.create_deposit(
            contract=contract,
            amount=Decimal("500.00"),
            payment_method=Payment.Method.CASH,
            created_by=self.owner,
            notes="Security deposit",
        )

        summary = FinanceService.calculate_profit(self.agency)

        self.assertEqual(summary["total_revenue"], Decimal("0.00"))
        self.assertEqual(summary["net_profit"], Decimal("0.00"))

    def test_expense_decreases_profit(self):
        contract = self.create_contract()
        invoice = contract.invoices.first()
        FinanceService.pay_invoice(
            invoice=invoice,
            amount=invoice.total_amount,
            method=Payment.Method.CASH,
            created_by=self.owner,
            notes="Rental settled",
        )
        FinanceService.create_expense(
            agency=self.agency,
            category=Expense.Category.CLEANING,
            title="Cleaning after return",
            amount=Decimal("50.00"),
            payment_method=Payment.Method.CASH,
            created_by=self.owner,
            description="Interior cleaning",
            expense_date=self.today,
            car=self.car,
            contract=contract,
        )

        summary = FinanceService.calculate_profit(self.agency)

        self.assertEqual(summary["total_revenue"], invoice.total_amount)
        self.assertEqual(summary["total_expenses"], Decimal("50.00"))
        self.assertEqual(summary["net_profit"], invoice.total_amount - Decimal("50.00"))

    def test_invoice_pdf_endpoint_returns_pdf_response(self):
        contract = self.create_contract()
        invoice = contract.invoices.first()
        self.authenticate(self.owner)

        response = self.client.get(f"/api/invoices/{invoice.id}/pdf/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
