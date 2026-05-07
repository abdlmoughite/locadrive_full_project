from datetime import timedelta
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from common.models import AgencyOwnedModel, TimeStampedModel, UUIDModel


class Maintenance(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    car = models.ForeignKey("fleet.Car", on_delete=models.CASCADE, related_name="maintenance_records")
    type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    started_at = models.DateTimeField(default=timezone.now)
    estimated_duration_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    maintenance_date = models.DateField()
    next_maintenance_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_created",
    )

    class Meta:
        ordering = ["-started_at", "-created_at"]

    def __str__(self) -> str:
        return f"{self.car} - {self.type}"

    @property
    def estimated_end_at(self):
        if self.started_at is None or self.estimated_duration_hours is None:
            return None
        duration_hours = float(self.estimated_duration_hours or Decimal("0.00"))
        if duration_hours <= 0:
            return None
        return self.started_at + timedelta(hours=duration_hours)


class Incident(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Type(models.TextChoices):
        ACCIDENT = "ACCIDENT", "Accident"
        DAMAGE = "DAMAGE", "Damage"
        FINE = "FINE", "Fine"
        LATE_RETURN = "LATE_RETURN", "Late return"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PAID = "PAID", "Paid"
        RESOLVED = "RESOLVED", "Resolved"
        CANCELLED = "CANCELLED", "Cancelled"

    contract = models.ForeignKey(
        "bookings.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    car = models.ForeignKey(
        "fleet.Car",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    description = models.TextField()
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents_created",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.type} - {self.amount}"
