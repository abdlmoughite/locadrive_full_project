from django.db import transaction
from rest_framework.exceptions import ValidationError

from clients.services import create_client_history_event
from finance.models import Invoice
from finance.services import FinanceService
from fleet.models import Car
from fleet.services import FleetService
from maintenance.models import Incident, Maintenance


class MaintenanceService:
    ACTIVE_STATUSES = {Maintenance.Status.SCHEDULED, Maintenance.Status.IN_PROGRESS}

    @staticmethod
    def _has_other_active_maintenance(car, exclude=None):
        queryset = car.maintenance_records.filter(status__in=MaintenanceService.ACTIVE_STATUSES)
        if exclude is not None:
            queryset = queryset.exclude(pk=exclude.pk)
        return queryset.exists()

    @staticmethod
    def _set_available_if_possible(car, actor, description):
        if not car.is_active:
            return car
        if MaintenanceService._has_other_active_maintenance(car):
            return car
        if car.status == Car.Status.MAINTENANCE:
            FleetService.set_car_status(car, Car.Status.AVAILABLE, actor, description)
        return car

    @staticmethod
    def create_maintenance_record(record):
        if record.status in MaintenanceService.ACTIVE_STATUSES:
            FleetService.set_car_status(
                record.car,
                Car.Status.MAINTENANCE,
                record.created_by,
                f"Maintenance scheduled: {record.type}",
            )
        return record

    @staticmethod
    def sync_maintenance_record(record, actor, previous_car=None):
        if previous_car and previous_car.pk != record.car_id:
            MaintenanceService._set_available_if_possible(
                previous_car,
                actor,
                f"Maintenance record moved away from {previous_car.plate_number}.",
            )

        if record.status in MaintenanceService.ACTIVE_STATUSES:
            FleetService.set_car_status(
                record.car,
                Car.Status.MAINTENANCE,
                actor,
                f"Maintenance status updated: {record.type}",
            )
            return record

        MaintenanceService._set_available_if_possible(
            record.car,
            actor,
            f"Maintenance no longer active: {record.type}",
        )
        return record

    @staticmethod
    @transaction.atomic
    def complete_maintenance(record, actor):
        if record.status == Maintenance.Status.COMPLETED:
            raise ValidationError({"status": "Maintenance record is already completed."})
        record.status = Maintenance.Status.COMPLETED
        record.save(update_fields=["status", "updated_at"])
        if record.cost > 0:
            FinanceService.create_expense(
                agency=record.agency,
                category="CAR_MAINTENANCE",
                title=f"Maintenance - {record.type}",
                amount=record.cost,
                payment_method="CASH",
                created_by=actor,
                description=record.description,
                expense_date=record.maintenance_date,
                car=record.car,
            )
        MaintenanceService._set_available_if_possible(
            record.car,
            actor,
            f"Maintenance completed: {record.type}",
        )
        return record

    @staticmethod
    @transaction.atomic
    def cancel_maintenance(record, actor):
        if record.status == Maintenance.Status.COMPLETED:
            raise ValidationError({"status": "Completed maintenance records cannot be cancelled."})
        if record.status == Maintenance.Status.CANCELLED:
            return record
        record.status = Maintenance.Status.CANCELLED
        record.save(update_fields=["status", "updated_at"])
        MaintenanceService._set_available_if_possible(
            record.car,
            actor,
            f"Maintenance cancelled: {record.type}",
        )
        return record

    @staticmethod
    @transaction.atomic
    def create_incident(incident):
        if incident.amount > 0 and incident.contract_id:
            invoice_type = (
                Invoice.Type.LATE_FEE_INVOICE
                if incident.type == Incident.Type.LATE_RETURN
                else Invoice.Type.DAMAGE_INVOICE
            )
            FinanceService.create_adjustment_invoice(
                contract=incident.contract,
                invoice_type=invoice_type,
                amount=incident.amount,
                description=incident.description,
                created_by=incident.created_by,
            )
        if incident.client_id:
            create_client_history_event(
                client=incident.client,
                event_type="INCIDENT",
                title=f"Incident created: {incident.type}",
                description=incident.description,
                created_by=incident.created_by,
                reference_id=incident.id,
            )
        if incident.car_id:
            FleetService.create_car_history_event(
                car=incident.car,
                event_type="INCIDENT",
                title=f"Incident created: {incident.type}",
                description=incident.description,
                created_by=incident.created_by,
                reference_id=incident.id,
            )
        return incident

    @staticmethod
    def resolve_incident(incident, actor):
        incident.status = Incident.Status.RESOLVED
        incident.save(update_fields=["status", "updated_at"])
        if incident.client_id:
            create_client_history_event(
                client=incident.client,
                event_type="INCIDENT",
                title=f"Incident resolved: {incident.type}",
                description=incident.description,
                created_by=actor,
                reference_id=incident.id,
            )
        if incident.car_id:
            FleetService.create_car_history_event(
                car=incident.car,
                event_type="INCIDENT",
                title=f"Incident resolved: {incident.type}",
                description=incident.description,
                created_by=actor,
                reference_id=incident.id,
            )
        return incident
