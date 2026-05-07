from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from accounts.managers import UserManager
from common.models import TimeStampedModel, UUIDModel


class User(UUIDModel, TimeStampedModel, AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPERADMIN = "SUPERADMIN", "Superadmin"
        AGENCY_OWNER = "AGENCY_OWNER", "Agency owner"
        AGENCY_AGENT = "AGENCY_AGENT", "Agency agent"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        SUSPENDED = "SUSPENDED", "Suspended"

    agency = models.ForeignKey(
        "agencies.Agency",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENCY_AGENT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_verified = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ["full_name", "email"]

    def clean(self) -> None:
        super().clean()
        if self.role == self.Role.SUPERADMIN and self.agency_id is not None:
            raise ValidationError({"agency": "Superadmin users cannot belong to an agency."})
        if self.role in {self.Role.AGENCY_OWNER, self.Role.AGENCY_AGENT} and self.agency_id is None:
            raise ValidationError({"agency": "Agency staff must belong to an agency."})

    def save(self, *args, **kwargs):
        self.email = self.__class__.objects.normalize_email(self.email)
        self.is_active = self.status == self.Status.ACTIVE
        if self.role == self.Role.SUPERADMIN:
            self.agency = None
            self.is_staff = True
            self.is_verified = True
        elif self.role == self.Role.AGENCY_AGENT:
            self.is_verified = True
        super().save(*args, **kwargs)

    @property
    def is_superadmin(self) -> bool:
        return self.role == self.Role.SUPERADMIN

    @property
    def verification_status(self) -> str:
        return "VERIFIED" if self.is_verified else "PENDING"

    def __str__(self) -> str:
        return self.email
