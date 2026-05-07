from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import AgencyOwnedModel, TimeStampedModel, UUIDModel


class Reservation(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        CONVERTED_TO_CONTRACT = "CONVERTED_TO_CONTRACT", "Converted to contract"

    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="reservations")
    car = models.ForeignKey("fleet.Car", on_delete=models.CASCADE, related_name="reservations")
    start_date = models.DateField()
    end_date = models.DateField()
    estimated_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    advance_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations_created",
    )

    class Meta:
        ordering = ["-created_at"]

    def clean(self) -> None:
        if self.end_date <= self.start_date:
            raise ValidationError({"end_date": "End date must be after start date."})

    def __str__(self) -> str:
        return f"{self.client} - {self.car}"


class Contract(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        OVERDUE = "OVERDUE", "Overdue"
        CANCELLED = "CANCELLED", "Cancelled"

    client = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="contracts")
    car = models.ForeignKey("fleet.Car", on_delete=models.CASCADE, related_name="contracts")
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts",
    )
    contract_number = models.CharField(max_length=32)
    start_date = models.DateField()
    expected_return_date = models.DateField()
    actual_return_date = models.DateField(null=True, blank=True)
    daily_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    days_count = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    extra_fees = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    start_mileage = models.PositiveIntegerField(default=0)
    return_mileage = models.PositiveIntegerField(null=True, blank=True)
    start_fuel_level = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    return_fuel_level = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    blacklist_override = models.BooleanField(default=False)
    blacklist_override_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contracts_created",
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["agency", "contract_number"], name="unique_contract_number_per_agency")
        ]

    def clean(self) -> None:
        if self.expected_return_date <= self.start_date:
            raise ValidationError({"expected_return_date": "Expected return date must be after start date."})

    def __str__(self) -> str:
        return self.contract_number
