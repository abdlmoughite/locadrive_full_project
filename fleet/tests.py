from datetime import timedelta

from fleet.models import Car
from common.test_helpers import BaseAPITestCase


class CarApiTests(BaseAPITestCase):
    def test_owner_can_create_car_with_normalized_choice_labels_without_agency(self):
        self.authenticate(self.owner)

        response = self.client.post(
            "/api/cars/",
            {
                "brand": "Hyundai",
                "model": "Tucson",
                "plate_number": "789-ALPHA",
                "year": 2025,
                "color": "Grey",
                "fuel_type": "Diesel",
                "transmission": "Manual",
                "daily_price": "450.00",
                "deposit_amount": "1500.00",
                "mileage": 1200,
                "status": "available",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        car = Car.objects.get(plate_number="789-ALPHA")
        self.assertEqual(car.agency, self.agency)
        self.assertEqual(car.fuel_type, Car.FuelType.DIESEL)
        self.assertEqual(car.transmission, Car.Transmission.MANUAL)
        self.assertEqual(car.status, Car.Status.AVAILABLE)

    def test_car_choices_endpoint_returns_backend_values_and_labels(self):
        self.authenticate(self.owner)

        response = self.client.get("/api/cars/choices/")

        self.assertEqual(response.status_code, 200)
        self.assertIn({"value": Car.FuelType.DIESEL, "label": "Diesel"}, response.data["fuel_type"])
        self.assertIn({"value": Car.Transmission.MANUAL, "label": "Manual"}, response.data["transmission"])
        self.assertIn({"value": Car.Status.AVAILABLE, "label": "Available"}, response.data["status"])

    def test_delete_car_soft_deactivates_vehicle(self):
        self.authenticate(self.owner)

        response = self.client.delete(f"/api/cars/{self.car.id}/")

        self.assertEqual(response.status_code, 204)
        self.car.refresh_from_db()
        self.assertFalse(self.car.is_active)
        self.assertEqual(self.car.status, Car.Status.OUT_OF_SERVICE)

    def test_inactive_car_is_excluded_from_available_endpoint(self):
        self.car.is_active = False
        self.car.status = Car.Status.OUT_OF_SERVICE
        self.car.save(update_fields=["is_active", "status", "updated_at"])
        self.authenticate(self.owner)

        response = self.client.get(
            "/api/cars/available/",
            {
                "start_date": self.today.isoformat(),
                "end_date": (self.today + timedelta(days=2)).isoformat(),
            },
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertNotIn(str(self.car.id), returned_ids)
