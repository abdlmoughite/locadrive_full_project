from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from common.models import AgencyOwnedModel, TimeStampedModel, UUIDModel


class Client(UUIDModel, AgencyOwnedModel, TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        WARNING = "WARNING", "Warning"
        BLACKLISTED = "BLACKLISTED", "Blacklisted"

    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    cin = models.CharField(max_length=100, blank=True)
    passport = models.CharField(max_length=100, blank=True)
    driving_license = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    birth_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    blacklisted = models.BooleanField(default=False)
    blacklist_reason = models.CharField(max_length=255, blank=True)
    blacklist_note = models.TextField(blank=True)
    blacklisted_at = models.DateTimeField(null=True, blank=True)
    blacklisted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blacklisted_clients",
    )
    total_spent = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    total_debt = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00"), validators=[MinValueValidator(0)]
    )
    total_contracts = models.PositiveIntegerField(default=0)
    last_rental_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["agency", "cin"],
                condition=Q(cin__isnull=False) & ~Q(cin=""),
                name="unique_client_cin_per_agency",
            ),
            models.UniqueConstraint(
                fields=["agency", "driving_license"],
                condition=Q(driving_license__isnull=False) & ~Q(driving_license=""),
                name="unique_client_license_per_agency",
            ),
            models.UniqueConstraint(
                fields=["agency", "passport"],
                condition=Q(passport__isnull=False) & ~Q(passport=""),
                name="unique_client_passport_per_agency",
            ),
        ]

    def __str__(self) -> str:
        return self.full_name


class ClientDocument(UUIDModel, AgencyOwnedModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="documents")
    type = models.CharField(max_length=100)
    file = models.FileField(upload_to="clients/documents/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.client} - {self.type}"


class ClientNote(UUIDModel, AgencyOwnedModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="notes")
    note = models.TextField()
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Note for {self.client.full_name}"


class ClientBlacklistLog(UUIDModel, AgencyOwnedModel):
    class Action(models.TextChoices):
        WARNING_ADDED = "WARNING_ADDED", "Warning added"
        WARNING_REMOVED = "WARNING_REMOVED", "Warning removed"
        BLACKLISTED = "BLACKLISTED", "Blacklisted"
        UNBLACKLISTED = "UNBLACKLISTED", "Unblacklisted"
        OVERRIDDEN = "OVERRIDDEN", "Overridden"

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="blacklist_logs")
    action = models.CharField(max_length=30, choices=Action.choices)
    reason = models.CharField(max_length=255, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_blacklist_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.client} - {self.action}"


class ClientHistoryEvent(UUIDModel, AgencyOwnedModel):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="history_events")
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_history_events",
    )
    event_type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    reference_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.client} - {self.title}"
