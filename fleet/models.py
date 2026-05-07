from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import AgencyOwnedModel, TimeStampedModel, UUIDModel


class Car(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class FuelType(models.TextChoices):
        PETROL = "PETROL", "Petrol"
        DIESEL = "DIESEL", "Diesel"
        HYBRID = "HYBRID", "Hybrid"
        ELECTRIC = "ELECTRIC", "Electric"
        GAS = "GAS", "Gas"
        OTHER = "OTHER", "Other"

    class Transmission(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATIC = "AUTOMATIC", "Automatic"
        SEMI_AUTOMATIC = "SEMI_AUTOMATIC", "Semi automatic"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        RESERVED = "RESERVED", "Reserved"
        RENTED = "RENTED", "Rented"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of service"

    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    plate_number = models.CharField(max_length=50)
    year = models.PositiveIntegerField(validators=[MinValueValidator(1900), MaxValueValidator(3000)])
    color = models.CharField(max_length=50, blank=True)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, default=FuelType.PETROL)
    transmission = models.CharField(max_length=20, choices=Transmission.choices, default=Transmission.MANUAL)
    daily_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    mileage = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["brand", "model", "plate_number"]
        constraints = [
            models.UniqueConstraint(fields=["agency", "plate_number"], name="unique_plate_number_per_agency")
        ]

    def __str__(self) -> str:
        return f"{self.brand} {self.model} ({self.plate_number})"


class CarDocument(UUIDModel, AgencyOwnedModel):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="documents")
    type = models.CharField(max_length=100)
    file = models.FileField(upload_to="cars/documents/")
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.car} - {self.type}"


class CarHistoryEvent(UUIDModel, AgencyOwnedModel):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="history_events")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="car_history_events",
    )
    event_type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    reference_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.car} - {self.title}"
