from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from bookings.models import Contract, Reservation
from clients.models import Client
from clients.models import ClientBlacklistLog
from clients.services import create_client_history_event
from finance.models import Invoice
from finance.services import FinanceService
from fleet.models import Car
from fleet.services import FleetService


ZERO = Decimal("0.00")


class BookingService:
    @staticmethod
    def generate_contract_number(agency, date_value=None):
        date_value = date_value or timezone.localdate()
        prefix = f"CTR-{date_value.year}-"
        latest_contract = (
            Contract.objects.filter(agency=agency, contract_number__startswith=prefix)
            .order_by("-contract_number")
            .first()
        )
        last_sequence = 0
        if latest_contract:
            try:
                last_sequence = int(latest_contract.contract_number.split("-")[-1])
            except (TypeError, ValueError):
                last_sequence = 0
        return f"{prefix}{last_sequence + 1:06d}"

    @staticmethod
    def _validate_dates(start_date, end_date):
        if end_date <= start_date:
            raise ValidationError({"end_date": "End date must be after start date."})

    @staticmethod
    def _calculate_days_count(start_date, end_date):
        return max((end_date - start_date).days, 1)

    @staticmethod
    def _validate_actor_and_relations(*, agency, client, car, actor, reservation=None):
        if actor and getattr(actor, "role", None) != "SUPERADMIN" and getattr(actor, "agency_id", None) != agency.id:
            raise PermissionDenied("You cannot create records for another agency.")
        if client.agency_id != agency.id:
            raise ValidationError({"client": "Client must belong to the same agency."})
        if car.agency_id != agency.id:
            raise ValidationError({"car": "Car must belong to the same agency."})
        if not car.is_active:
            raise ValidationError({"car": "Inactive cars cannot be used in reservations or contracts."})
        if reservation:
            if reservation.agency_id != agency.id:
                raise ValidationError({"reservation": "Reservation must belong to the same agency."})
            if reservation.client_id != client.id:
                raise ValidationError({"client": "Reservation client does not match the selected client."})
            if reservation.car_id != car.id:
                raise ValidationError({"car": "Reservation car does not match the selected car."})

    @staticmethod
    @transaction.atomic
    def create_reservation(
        *,
        agency,
        client=None,
        car,
        start_date,
        end_date,
        advance_amount=ZERO,
        created_by=None,
        new_client_data=None,
    ):
        if client is None and not new_client_data:
            raise ValidationError({"client": "A client is required to create a reservation."})
        if client is not None and new_client_data:
            raise ValidationError({"client": "Choose an existing client or provide new client data, not both."})
        if client is None:
            client = Client.objects.create(
                agency=agency,
                full_name=new_client_data["full_name"].strip(),
                phone=new_client_data.get("phone", "").strip(),
                email=new_client_data.get("email", "").strip(),
                cin=new_client_data.get("cin", "").strip(),
                passport=new_client_data.get("passport", "").strip(),
                driving_license=new_client_data.get("driving_license", "").strip(),
                address=new_client_data.get("address", "").strip(),
                birth_date=new_client_data.get("birth_date"),
            )
        BookingService._validate_actor_and_relations(
            agency=agency,
            client=client,
            car=car,
            actor=created_by,
        )
        BookingService._validate_dates(start_date, end_date)
        if not FleetService.check_car_availability(car, start_date, end_date):
            raise ValidationError({"car": "Car is not available for the selected dates."})

        days_count = BookingService._calculate_days_count(start_date, end_date)
        estimated_total = car.daily_price * Decimal(days_count)
        reservation = Reservation.objects.create(
            agency=agency,
            client=client,
            car=car,
            start_date=start_date,
            end_date=end_date,
            estimated_total=estimated_total,
            advance_amount=advance_amount,
            status=Reservation.Status.PENDING,
            created_by=created_by,
        )
        create_client_history_event(
            client=client,
            event_type="RESERVATION",
            title="Reservation created",
            description=f"Reservation from {start_date} to {end_date}.",
            created_by=created_by,
            reference_id=reservation.id,
        )
        FleetService.create_car_history_event(
            car=car,
            event_type="RESERVATION",
            title="Reservation created",
            description=f"Reservation {reservation.id} created.",
            created_by=created_by,
            reference_id=reservation.id,
        )
        return reservation

    @staticmethod
    def confirm_reservation(reservation, actor):
        if reservation.status == Reservation.Status.CANCELLED:
            raise ValidationError({"status": "Cancelled reservations cannot be confirmed."})
        reservation.status = Reservation.Status.CONFIRMED
        reservation.save(update_fields=["status", "updated_at"])
        FleetService.create_car_history_event(
            car=reservation.car,
            event_type="RESERVATION",
            title="Reservation confirmed",
            description=f"Reservation {reservation.id} confirmed.",
            created_by=actor,
            reference_id=reservation.id,
        )
        return reservation

    @staticmethod
    def cancel_reservation(reservation, actor):
        reservation.status = Reservation.Status.CANCELLED
        reservation.save(update_fields=["status", "updated_at"])
        FleetService.create_car_history_event(
            car=reservation.car,
            event_type="RESERVATION",
            title="Reservation cancelled",
            description=f"Reservation {reservation.id} cancelled.",
            created_by=actor,
            reference_id=reservation.id,
        )
        create_client_history_event(
            client=reservation.client,
            event_type="RESERVATION",
            title="Reservation cancelled",
            description=f"Reservation {reservation.id} cancelled.",
            created_by=actor,
            reference_id=reservation.id,
        )
        return reservation

    @staticmethod
    @transaction.atomic
    def create_contract(
        *,
        agency,
        client,
        car,
        start_date,
        expected_return_date,
        daily_price,
        start_mileage,
        start_fuel_level,
        created_by,
        reservation=None,
        discount_amount=ZERO,
        extra_fees=ZERO,
        blacklist_override_reason="",
        activate_now=False,
    ):
        BookingService._validate_actor_and_relations(
            agency=agency,
            client=client,
            car=car,
            actor=created_by,
            reservation=reservation,
        )
        BookingService._validate_dates(start_date, expected_return_date)
        exclude_reservation = reservation if reservation else None
        if not FleetService.check_car_availability(
            car,
            start_date,
            expected_return_date,
            exclude_reservation=exclude_reservation,
        ):
            raise ValidationError({"car": "Car is not available for the selected dates."})

        if client.blacklisted:
            if created_by.role not in {"AGENCY_OWNER", "SUPERADMIN"} or not blacklist_override_reason:
                raise ValidationError({"client": "Blacklisted clients require owner override to create contracts."})
            ClientBlacklistLog.objects.create(
                agency=agency,
                client=client,
                action=ClientBlacklistLog.Action.OVERRIDDEN,
                reason=blacklist_override_reason,
                note="Blacklist override used for contract creation.",
                created_by=created_by,
            )
            create_client_history_event(
                client=client,
                event_type="BLACKLIST_OVERRIDE",
                title="Blacklist override applied",
                description=blacklist_override_reason,
                created_by=created_by,
            )

        days_count = BookingService._calculate_days_count(start_date, expected_return_date)
        subtotal = Decimal(days_count) * daily_price
        total_amount = subtotal + extra_fees - discount_amount
        contract = Contract.objects.create(
            agency=agency,
            client=client,
            car=car,
            reservation=reservation,
            contract_number=BookingService.generate_contract_number(agency, start_date),
            start_date=start_date,
            expected_return_date=expected_return_date,
            daily_price=daily_price,
            days_count=days_count,
            subtotal=subtotal,
            extra_fees=extra_fees,
            discount_amount=discount_amount,
            total_amount=total_amount,
            paid_amount=ZERO,
            remaining_amount=total_amount,
            start_mileage=start_mileage,
            start_fuel_level=start_fuel_level,
            status=Contract.Status.DRAFT,
            blacklist_override=bool(blacklist_override_reason),
            blacklist_override_reason=blacklist_override_reason,
            created_by=created_by,
        )
        FinanceService.create_invoice_for_contract(contract, created_by)

        client.total_contracts += 1
        client.last_rental_date = start_date
        client.save(update_fields=["total_contracts", "last_rental_date", "updated_at"])

        if reservation:
            reservation.status = Reservation.Status.CONVERTED_TO_CONTRACT
            reservation.save(update_fields=["status", "updated_at"])

        create_client_history_event(
            client=client,
            event_type="CONTRACT",
            title="Contract created",
            description=f"Contract {contract.contract_number} created.",
            created_by=created_by,
            reference_id=contract.id,
        )
        FleetService.create_car_history_event(
            car=car,
            event_type="CONTRACT",
            title="Contract created",
            description=f"Contract {contract.contract_number} created.",
            created_by=created_by,
            reference_id=contract.id,
        )

        if activate_now:
            BookingService.activate_contract(contract, created_by)
        return contract

    @staticmethod
    @transaction.atomic
    def convert_reservation_to_contract(reservation, actor, **kwargs):
        if reservation.status in {Reservation.Status.CANCELLED, Reservation.Status.CONVERTED_TO_CONTRACT}:
            raise ValidationError({"reservation": "Reservation cannot be converted in its current state."})
        return BookingService.create_contract(
            agency=reservation.agency,
            client=reservation.client,
            car=reservation.car,
            start_date=reservation.start_date,
            expected_return_date=reservation.end_date,
            daily_price=kwargs.get("daily_price", reservation.car.daily_price),
            start_mileage=kwargs.get("start_mileage", reservation.car.mileage),
            start_fuel_level=kwargs.get("start_fuel_level", Decimal("100.00")),
            created_by=actor,
            reservation=reservation,
            discount_amount=kwargs.get("discount_amount", ZERO),
            extra_fees=kwargs.get("extra_fees", ZERO),
            blacklist_override_reason=kwargs.get("blacklist_override_reason", ""),
            activate_now=kwargs.get("activate_now", False),
        )

    @staticmethod
    @transaction.atomic
    def activate_contract(contract, actor):
        if contract.status == Contract.Status.CANCELLED:
            raise ValidationError({"status": "Cancelled contracts cannot be activated."})
        if contract.client.blacklisted and not contract.blacklist_override:
            raise PermissionDenied("Blacklisted clients cannot be activated without override.")
        if not FleetService.check_car_availability(
            contract.car,
            contract.start_date,
            contract.expected_return_date,
            exclude_contract=contract,
            exclude_reservation=contract.reservation,
        ):
            raise ValidationError({"car": "Car is no longer available for this contract."})
        contract.status = Contract.Status.ACTIVE
        contract.save(update_fields=["status", "updated_at"])
        FleetService.set_car_status(contract.car, Car.Status.RENTED, actor, f"Activated contract {contract.contract_number}")
        create_client_history_event(
            client=contract.client,
            event_type="CONTRACT",
            title="Contract activated",
            description=f"Contract {contract.contract_number} activated.",
            created_by=actor,
            reference_id=contract.id,
        )
        return contract

    @staticmethod
    @transaction.atomic
    def complete_contract(
        contract,
        actor,
        *,
        actual_return_date,
        return_mileage,
        return_fuel_level,
        late_fee=ZERO,
        damage_fee=ZERO,
        fuel_fee=ZERO,
        maintenance_required=False,
    ):
        if contract.status not in {Contract.Status.ACTIVE, Contract.Status.OVERDUE, Contract.Status.DRAFT}:
            raise ValidationError({"status": "Only active, overdue, or draft contracts can be completed."})
        if actual_return_date < contract.start_date:
            raise ValidationError({"actual_return_date": "Actual return date cannot be before start date."})

        late_days = max((actual_return_date - contract.expected_return_date).days, 0)
        if late_days and late_fee == ZERO:
            late_fee = contract.daily_price * Decimal(late_days)

        adjustments = [
            (late_fee, Invoice.Type.LATE_FEE_INVOICE, "Late return fee"),
            (damage_fee, Invoice.Type.DAMAGE_INVOICE, "Damage fee"),
            (fuel_fee, Invoice.Type.FUEL_FEE_INVOICE, "Fuel fee"),
        ]
        generated_extra_fees = ZERO
        for amount, invoice_type, label in adjustments:
            if amount > ZERO:
                FinanceService.create_adjustment_invoice(
                    contract=contract,
                    invoice_type=invoice_type,
                    amount=amount,
                    description=f"{label} for {contract.contract_number}",
                    created_by=actor,
                )
                generated_extra_fees += amount

        contract.actual_return_date = actual_return_date
        contract.return_mileage = return_mileage
        contract.return_fuel_level = return_fuel_level
        contract.extra_fees += generated_extra_fees
        contract.total_amount += generated_extra_fees
        contract.status = Contract.Status.COMPLETED
        contract.save(
            update_fields=[
                "actual_return_date",
                "return_mileage",
                "return_fuel_level",
                "extra_fees",
                "total_amount",
                "status",
                "updated_at",
            ]
        )
        FinanceService.sync_contract_amounts(contract)

        contract.car.mileage = return_mileage
        contract.car.save(update_fields=["mileage", "updated_at"])
        next_status = Car.Status.MAINTENANCE if maintenance_required else Car.Status.AVAILABLE
        FleetService.set_car_status(
            contract.car,
            next_status,
            actor,
            f"Contract {contract.contract_number} completed.",
        )
        create_client_history_event(
            client=contract.client,
            event_type="CONTRACT",
            title="Contract completed",
            description=f"Contract {contract.contract_number} completed.",
            created_by=actor,
            reference_id=contract.id,
        )
        return contract

    @staticmethod
    @transaction.atomic
    def cancel_contract(contract, actor):
        if contract.status == Contract.Status.COMPLETED:
            raise ValidationError({"status": "Completed contracts cannot be cancelled."})
        contract.status = Contract.Status.CANCELLED
        contract.save(update_fields=["status", "updated_at"])
        contract.invoices.exclude(status__in=[Invoice.Status.PAID, Invoice.Status.REFUNDED]).update(
            status=Invoice.Status.CANCELLED,
            remaining_amount=ZERO,
        )
        if contract.car.status == Car.Status.RENTED:
            FleetService.set_car_status(contract.car, Car.Status.AVAILABLE, actor, "Contract cancelled.")
        create_client_history_event(
            client=contract.client,
            event_type="CONTRACT",
            title="Contract cancelled",
            description=f"Contract {contract.contract_number} cancelled.",
            created_by=actor,
            reference_id=contract.id,
        )
        return contract

    @staticmethod
    def get_financial_summary(contract):
        invoices = contract.invoices.exclude(status=Invoice.Status.CANCELLED)
        return {
            "contract_number": contract.contract_number,
            "total_invoiced": invoices.aggregate(total=Sum("total_amount"))["total"] or ZERO,
            "total_paid": invoices.aggregate(total=Sum("paid_amount"))["total"] or ZERO,
            "total_due": invoices.aggregate(total=Sum("remaining_amount"))["total"] or ZERO,
            "deposits_held": contract.deposits.aggregate(total=Sum("held_amount"))["total"] or ZERO,
        }


generate_contract_number = BookingService.generate_contract_number
create_reservation = BookingService.create_reservation
convert_reservation_to_contract = BookingService.convert_reservation_to_contract
create_contract = BookingService.create_contract
activate_contract = BookingService.activate_contract
complete_contract = BookingService.complete_contract
cancel_contract = BookingService.cancel_contract
get_contract_financial_summary = BookingService.get_financial_summary
