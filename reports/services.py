from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from bookings.models import Contract, Reservation
from clients.models import Client
from finance.models import Deposit, FinancialTransaction, Invoice, Payment
from fleet.models import Car


ZERO = Decimal("0.00")
DEPOSIT_EXCLUDED_TRANSACTION_TYPES = {
    FinancialTransaction.Type.DEPOSIT_HOLD,
    FinancialTransaction.Type.DEPOSIT_REFUND,
}


class ReportService:
    @staticmethod
    def get_dashboard_summary(agency):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        active_cars = Car.objects.filter(agency=agency, is_active=True)
        revenue_today = FinancialTransaction.objects.filter(
            agency=agency,
            direction=FinancialTransaction.Direction.INCOME,
            transaction_date__date=today,
        ).exclude(type__in=DEPOSIT_EXCLUDED_TRANSACTION_TYPES)
        revenue_month = FinancialTransaction.objects.filter(
            agency=agency,
            direction=FinancialTransaction.Direction.INCOME,
            transaction_date__date__gte=month_start,
            transaction_date__date__lte=today,
        ).exclude(type__in=DEPOSIT_EXCLUDED_TRANSACTION_TYPES)
        expenses_month = FinancialTransaction.objects.filter(
            agency=agency,
            direction=FinancialTransaction.Direction.OUTCOME,
            type=FinancialTransaction.Type.EXPENSE,
            transaction_date__date__gte=month_start,
            transaction_date__date__lte=today,
        )

        revenue_today_total = revenue_today.aggregate(total=Sum("amount"))["total"] or ZERO
        revenue_month_total = revenue_month.aggregate(total=Sum("amount"))["total"] or ZERO
        expenses_month_total = expenses_month.aggregate(total=Sum("amount"))["total"] or ZERO

        recent_reservations = list(
            Reservation.objects.filter(agency=agency)
            .select_related("client", "car")
            .order_by("-created_at")[:5]
            .values(
                "id",
                "status",
                "start_date",
                "end_date",
                "estimated_total",
                "client__full_name",
                "car__brand",
                "car__model",
                "car__plate_number",
            )
        )

        return {
            "total_cars": Car.objects.filter(agency=agency).count(),
            "active_cars": active_cars.count(),
            "inactive_cars": Car.objects.filter(agency=agency, is_active=False).count(),
            "cars_available": active_cars.filter(status=Car.Status.AVAILABLE).count(),
            "cars_rented": active_cars.filter(status=Car.Status.RENTED).count(),
            "cars_maintenance": active_cars.filter(status=Car.Status.MAINTENANCE).count(),
            "active_contracts": Contract.objects.filter(
                agency=agency, status__in=[Contract.Status.ACTIVE, Contract.Status.OVERDUE]
            ).count(),
            "active_reservations": Reservation.objects.filter(
                agency=agency,
                status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            ).count(),
            "reservations_today": Reservation.objects.filter(agency=agency, start_date=today).count(),
            "returns_today": Contract.objects.filter(
                agency=agency,
                expected_return_date=today,
                status__in=[Contract.Status.ACTIVE, Contract.Status.OVERDUE],
            ).count(),
            "total_clients": Client.objects.filter(agency=agency).count(),
            "revenue_today": revenue_today_total,
            "revenue_this_month": revenue_month_total,
            "expenses_this_month": expenses_month_total,
            "net_profit_this_month": revenue_month_total - expenses_month_total,
            "deposits_held": Deposit.objects.filter(agency=agency).aggregate(total=Sum("held_amount"))["total"] or ZERO,
            "client_debts": Client.objects.filter(agency=agency).aggregate(total=Sum("total_debt"))["total"] or ZERO,
            "unpaid_invoices": Invoice.objects.filter(
                agency=agency,
                remaining_amount__gt=ZERO,
            )
            .exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED])
            .count(),
            "recent_reservations": recent_reservations,
        }

    @staticmethod
    def get_finance_summary(agency, start_date=None, end_date=None):
        transaction_qs = FinancialTransaction.objects.filter(agency=agency)
        invoice_qs = Invoice.objects.filter(agency=agency).exclude(
            status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED]
        )
        deposit_qs = Deposit.objects.filter(agency=agency)
        client_qs = Client.objects.filter(agency=agency)

        if start_date:
            transaction_qs = transaction_qs.filter(transaction_date__date__gte=start_date)
            invoice_qs = invoice_qs.filter(issue_date__gte=start_date)
            deposit_qs = deposit_qs.filter(held_at__date__gte=start_date)
        if end_date:
            transaction_qs = transaction_qs.filter(transaction_date__date__lte=end_date)
            invoice_qs = invoice_qs.filter(issue_date__lte=end_date)
            deposit_qs = deposit_qs.filter(held_at__date__lte=end_date)

        revenue = (
            transaction_qs.filter(direction=FinancialTransaction.Direction.INCOME)
            .exclude(type__in=DEPOSIT_EXCLUDED_TRANSACTION_TYPES)
            .aggregate(total=Sum("amount"))["total"]
            or ZERO
        )
        expenses = (
            transaction_qs.filter(
                direction=FinancialTransaction.Direction.OUTCOME,
                type=FinancialTransaction.Type.EXPENSE,
            ).aggregate(total=Sum("amount"))["total"]
            or ZERO
        )
        deposits_received = (
            transaction_qs.filter(type=FinancialTransaction.Type.DEPOSIT_HOLD).aggregate(total=Sum("amount"))["total"]
            or ZERO
        )
        deposits_refunded = (
            transaction_qs.filter(type=FinancialTransaction.Type.DEPOSIT_REFUND).aggregate(total=Sum("amount"))["total"]
            or ZERO
        )

        return {
            "total_revenue": revenue,
            "total_expenses": expenses,
            "net_profit": revenue - expenses,
            "deposits_received": deposits_received,
            "deposits_refunded": deposits_refunded,
            "deposits_currently_held": deposit_qs.aggregate(total=Sum("held_amount"))["total"] or ZERO,
            "unpaid_invoices": invoice_qs.aggregate(total=Sum("remaining_amount"))["total"] or ZERO,
            "client_debts": client_qs.aggregate(total=Sum("total_debt"))["total"] or ZERO,
        }

    @staticmethod
    def get_car_profitability(agency, start_date=None, end_date=None):
        cars = Car.objects.filter(agency=agency).order_by("brand", "model", "plate_number")
        results = []
        for car in cars:
            transactions = car.financial_transactions.all()
            contracts = car.contracts.all()
            if start_date:
                transactions = transactions.filter(transaction_date__date__gte=start_date)
                contracts = contracts.filter(start_date__gte=start_date)
            if end_date:
                transactions = transactions.filter(transaction_date__date__lte=end_date)
                contracts = contracts.filter(start_date__lte=end_date)

            rental_revenue = (
                transactions.filter(type=FinancialTransaction.Type.RENTAL_REVENUE).aggregate(total=Sum("amount"))["total"]
                or ZERO
            )
            extra_fees = (
                transactions.filter(
                    type__in=[
                        FinancialTransaction.Type.DAMAGE_FEE,
                        FinancialTransaction.Type.LATE_FEE,
                        FinancialTransaction.Type.FUEL_FEE,
                        FinancialTransaction.Type.DEPOSIT_USAGE,
                    ]
                ).aggregate(total=Sum("amount"))["total"]
                or ZERO
            )
            expenses = (
                transactions.filter(
                    direction=FinancialTransaction.Direction.OUTCOME,
                    type=FinancialTransaction.Type.EXPENSE,
                ).aggregate(total=Sum("amount"))["total"]
                or ZERO
            )
            total_revenue = rental_revenue + extra_fees
            results.append(
                {
                    "car": {
                        "id": str(car.id),
                        "label": str(car),
                        "plate_number": car.plate_number,
                    },
                    "rental_revenue": rental_revenue,
                    "extra_fees": extra_fees,
                    "total_revenue": total_revenue,
                    "expenses": expenses,
                    "net_profit": total_revenue - expenses,
                    "contracts_count": contracts.count(),
                }
            )
        return results

    @staticmethod
    def get_client_balances(agency):
        clients = Client.objects.filter(agency=agency).prefetch_related("deposits", "payments", "invoices")
        results = []
        for client in clients:
            total_paid = (
                client.payments.filter(direction=Payment.Direction.INCOME, status=Payment.Status.PAID)
                .exclude(type__in=[Payment.Type.DEPOSIT, Payment.Type.DEPOSIT_REFUND])
                .aggregate(total=Sum("amount"))["total"]
                or ZERO
            )
            total_unpaid = (
                client.invoices.exclude(status__in=[Invoice.Status.CANCELLED, Invoice.Status.REFUNDED]).aggregate(
                    total=Sum("remaining_amount")
                )["total"]
                or ZERO
            )
            active_deposit = client.deposits.aggregate(total=Sum("held_amount"))["total"] or ZERO
            results.append(
                {
                    "client": {
                        "id": str(client.id),
                        "full_name": client.full_name,
                        "phone": client.phone,
                    },
                    "total_paid": total_paid,
                    "total_unpaid": total_unpaid,
                    "total_debt": client.total_debt,
                    "active_deposit": active_deposit,
                    "blacklist_status": client.status,
                }
            )
        return results


get_dashboard_summary = ReportService.get_dashboard_summary
get_finance_summary = ReportService.get_finance_summary
get_car_profitability = ReportService.get_car_profitability
get_client_balances = ReportService.get_client_balances
