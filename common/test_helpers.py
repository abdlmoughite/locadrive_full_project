from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from agencies.models import Agency
from bookings.services import BookingService
from clients.models import Client
from fleet.models import Car


class BaseAPITestCase(APITestCase):
    password = "Password123!"

    def setUp(self):
        super().setUp()
        self.today = timezone.localdate()
        self.agency = Agency.objects.create(
            name="Alpha Rentals",
            phone="+212600000001",
            email="alpha@example.com",
            address="Casablanca",
        )
        self.other_agency = Agency.objects.create(
            name="Beta Rentals",
            phone="+212600000002",
            email="beta@example.com",
            address="Rabat",
        )

        self.superadmin = User.objects.create_superuser(
            email="admin@example.com",
            password=self.password,
            full_name="Super Admin",
        )
        self.owner = User.objects.create_user(
            email="owner@alpha.com",
            password=self.password,
            full_name="Alpha Owner",
            agency=self.agency,
            role=User.Role.AGENCY_OWNER,
        )
        self.agent = User.objects.create_user(
            email="agent@alpha.com",
            password=self.password,
            full_name="Alpha Agent",
            agency=self.agency,
            role=User.Role.AGENCY_AGENT,
        )
        self.other_owner = User.objects.create_user(
            email="owner@beta.com",
            password=self.password,
            full_name="Beta Owner",
            agency=self.other_agency,
            role=User.Role.AGENCY_OWNER,
        )

        self.car = self.create_car(self.agency, "123-ALPHA")
        self.other_car = self.create_car(self.other_agency, "456-BETA")
        self.client_record = self.create_client(self.agency, "Alice Client", cin="CIN-001")
        self.other_client = self.create_client(self.other_agency, "Bob Client", cin="CIN-002")

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def create_car(self, agency, plate_number, **kwargs):
        defaults = {
            "brand": "Dacia",
            "model": "Logan",
            "year": 2024,
            "color": "White",
            "fuel_type": Car.FuelType.DIESEL,
            "transmission": Car.Transmission.MANUAL,
            "daily_price": Decimal("200.00"),
            "deposit_amount": Decimal("500.00"),
            "mileage": 10000,
            "status": Car.Status.AVAILABLE,
        }
        defaults.update(kwargs)
        return Car.objects.create(agency=agency, plate_number=plate_number, **defaults)

    def create_client(self, agency, full_name, **kwargs):
        defaults = {
            "phone": "+212612345678",
            "email": f"{full_name.lower().replace(' ', '.')}@example.com",
            "driving_license": "",
            "passport": "",
            "address": "Test address",
        }
        defaults.update(kwargs)
        return Client.objects.create(agency=agency, full_name=full_name, **defaults)

    def create_contract(self, *, client=None, car=None, created_by=None, **kwargs):
        client = client or self.client_record
        car = car or self.car
        created_by = created_by or self.owner
        defaults = {
            "agency": client.agency,
            "client": client,
            "car": car,
            "start_date": self.today,
            "expected_return_date": self.today + timedelta(days=2),
            "daily_price": car.daily_price,
            "start_mileage": car.mileage,
            "start_fuel_level": Decimal("100.00"),
            "created_by": created_by,
            "discount_amount": Decimal("0.00"),
            "extra_fees": Decimal("0.00"),
            "blacklist_override_reason": "",
            "activate_now": False,
        }
        defaults.update(kwargs)
        return BookingService.create_contract(**defaults)
