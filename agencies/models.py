from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError

from common.models import TimeStampedModel, UUIDModel


class Agency(UUIDModel, TimeStampedModel):
    class SubscriptionStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        PAST_DUE = "PAST_DUE", "Past due"

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to="agencies/logos/", null=True, blank=True)
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Subscription(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        PAST_DUE = "PAST_DUE", "Past due"

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="subscriptions")
    plan_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["agency"],
                condition=Q(status="ACTIVE"),
                name="unique_active_subscription_per_agency",
            )
        ]

    def clean(self) -> None:
        if self.end_date <= self.start_date:
            raise ValidationError({"end_date": "End date must be after start date."})

    def __str__(self) -> str:
        return f"{self.agency.name} - {self.plan_name}"
