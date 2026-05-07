from rest_framework.exceptions import ValidationError

from common.services import build_overlap_query
from fleet.models import Car, CarHistoryEvent


class FleetService:
    @staticmethod
    def create_car_history_event(car, event_type, title, description="", created_by=None, reference_id=None):
        return CarHistoryEvent.objects.create(
            agency=car.agency,
            car=car,
            created_by=created_by,
            event_type=event_type,
            title=title,
            description=description,
            reference_id=reference_id,
        )

    @staticmethod
    def check_car_availability(car, start_date, end_date, exclude_reservation=None, exclude_contract=None):
        from bookings.models import Contract, Reservation

        if end_date <= start_date:
            return False

        if not car.is_active:
            return False

        if car.status in {Car.Status.MAINTENANCE, Car.Status.OUT_OF_SERVICE}:
            return False

        reservation_qs = Reservation.objects.filter(
            agency=car.agency,
            car=car,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        ).filter(build_overlap_query("start_date", "end_date", start_date, end_date))
        if exclude_reservation:
            reservation_qs = reservation_qs.exclude(pk=exclude_reservation.pk)

        contract_qs = Contract.objects.filter(
            agency=car.agency,
            car=car,
            status__in=[Contract.Status.DRAFT, Contract.Status.ACTIVE, Contract.Status.OVERDUE],
        ).filter(build_overlap_query("start_date", "expected_return_date", start_date, end_date))
        if exclude_contract:
            contract_qs = contract_qs.exclude(pk=exclude_contract.pk)

        return not reservation_qs.exists() and not contract_qs.exists()

    @staticmethod
    def set_car_status(car, status, actor=None, description=""):
        if not car.is_active and status != Car.Status.OUT_OF_SERVICE:
            raise ValidationError({"car": "Inactive cars must be reactivated before they can be used again."})
        car.status = status
        car.save(update_fields=["status", "updated_at"])
        FleetService.create_car_history_event(
            car=car,
            event_type="STATUS_CHANGED",
            title=f"Car status set to {status}",
            description=description,
            created_by=actor,
        )
        return car

    @staticmethod
    def get_car_history(car):
        return car.history_events.select_related("created_by").order_by("-created_at")

    @staticmethod
    def deactivate_car(car, actor=None, description=""):
        from bookings.models import Contract, Reservation

        active_contract_exists = Contract.objects.filter(
            car=car,
            status__in=[Contract.Status.DRAFT, Contract.Status.ACTIVE, Contract.Status.OVERDUE],
        ).exists()
        active_reservation_exists = Reservation.objects.filter(
            car=car,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        ).exists()

        if active_contract_exists or active_reservation_exists:
            raise ValidationError({"car": "Cars with active contracts or reservations cannot be deactivated."})

        if not car.is_active and car.status == Car.Status.OUT_OF_SERVICE:
            return car

        car.is_active = False
        car.status = Car.Status.OUT_OF_SERVICE
        car.save(update_fields=["is_active", "status", "updated_at"])
        FleetService.create_car_history_event(
            car=car,
            event_type="DEACTIVATED",
            title="Car deactivated",
            description=description or "Car deactivated and removed from operational availability.",
            created_by=actor,
        )
        return car

    @staticmethod
    def reactivate_car(car, actor=None, description=""):
        if car.is_active:
            return car

        car.is_active = True
        if car.status == Car.Status.OUT_OF_SERVICE:
            car.status = Car.Status.AVAILABLE
        car.save(update_fields=["is_active", "status", "updated_at"])
        FleetService.create_car_history_event(
            car=car,
            event_type="REACTIVATED",
            title="Car reactivated",
            description=description or "Car reactivated and returned to operational usage.",
            created_by=actor,
        )
        return car


check_car_availability = FleetService.check_car_availability
set_car_status = FleetService.set_car_status
get_car_history = FleetService.get_car_history
deactivate_car = FleetService.deactivate_car
reactivate_car = FleetService.reactivate_car
