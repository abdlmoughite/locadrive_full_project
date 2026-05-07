from datetime import timedelta

from clients.models import Client
from finance.models import Invoice
from common.test_helpers import BaseAPITestCase


class BookingWorkflowTests(BaseAPITestCase):
    def test_agency_data_isolation(self):
        self.authenticate(self.owner)

        response = self.client.get("/api/clients/")

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertIn(str(self.client_record.id), returned_ids)
        self.assertNotIn(str(self.other_client.id), returned_ids)

    def test_blacklist_blocks_contract_creation_for_agent(self):
        self.client_record.blacklisted = True
        self.client_record.status = self.client_record.Status.BLACKLISTED
        self.client_record.save(update_fields=["blacklisted", "status", "updated_at"])

        self.authenticate(self.agent)
        response = self.client.post(
            "/api/contracts/",
            {
                "client": str(self.client_record.id),
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "expected_return_date": (self.today + timedelta(days=2)).isoformat(),
                "start_mileage": self.car.mileage,
                "start_fuel_level": "100.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("client", response.data)

    def test_owner_can_override_blacklist(self):
        self.client_record.blacklisted = True
        self.client_record.status = self.client_record.Status.BLACKLISTED
        self.client_record.save(update_fields=["blacklisted", "status", "updated_at"])

        self.authenticate(self.owner)
        response = self.client.post(
            "/api/contracts/",
            {
                "client": str(self.client_record.id),
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "expected_return_date": (self.today + timedelta(days=2)).isoformat(),
                "start_mileage": self.car.mileage,
                "start_fuel_level": "100.00",
                "blacklist_override_reason": "VIP settlement approved",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["blacklist_override"])

    def test_car_availability_prevents_double_booking(self):
        self.authenticate(self.owner)

        first_response = self.client.post(
            "/api/reservations/",
            {
                "client": str(self.client_record.id),
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "end_date": (self.today + timedelta(days=3)).isoformat(),
                "advance_amount": "0.00",
            },
            format="json",
        )
        self.assertEqual(first_response.status_code, 201)

        second_response = self.client.post(
            "/api/reservations/",
            {
                "client": str(self.client_record.id),
                "car": str(self.car.id),
                "start_date": (self.today + timedelta(days=1)).isoformat(),
                "end_date": (self.today + timedelta(days=4)).isoformat(),
                "advance_amount": "0.00",
            },
            format="json",
        )

        self.assertEqual(second_response.status_code, 400)
        self.assertIn("car", second_response.data)

    def test_owner_cannot_create_reservation_with_other_agency_car(self):
        self.authenticate(self.owner)

        response = self.client.post(
            "/api/reservations/",
            {
                "client": str(self.client_record.id),
                "car": str(self.other_car.id),
                "start_date": self.today.isoformat(),
                "end_date": (self.today + timedelta(days=2)).isoformat(),
                "advance_amount": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("car", response.data)

    def test_superadmin_cannot_mix_agency_client_and_car_on_contract_create(self):
        self.authenticate(self.superadmin)

        response = self.client.post(
            "/api/contracts/",
            {
                "agency": str(self.agency.id),
                "client": str(self.other_client.id),
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "expected_return_date": (self.today + timedelta(days=2)).isoformat(),
                "start_mileage": self.car.mileage,
                "start_fuel_level": "100.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("client", response.data)

    def test_contract_creation_generates_invoice(self):
        self.authenticate(self.owner)
        response = self.client.post(
            "/api/contracts/",
            {
                "client": str(self.client_record.id),
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "expected_return_date": (self.today + timedelta(days=2)).isoformat(),
                "start_mileage": self.car.mileage,
                "start_fuel_level": "100.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Invoice.objects.filter(contract_id=response.data["id"]).exists())

    def test_reservation_can_create_new_client_inline(self):
        self.authenticate(self.owner)

        response = self.client.post(
            "/api/reservations/",
            {
                "new_client": {
                    "full_name": "Samir Ait Lahcen",
                    "phone": "0670001122",
                    "email": "samir@demo.test",
                    "cin": "AA998877",
                    "driving_license": "DL-AA998877",
                    "address": "Casablanca",
                },
                "car": str(self.car.id),
                "start_date": self.today.isoformat(),
                "end_date": (self.today + timedelta(days=2)).isoformat(),
                "advance_amount": "150.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["advance_amount"], "150.00")
        self.assertTrue(Client.objects.filter(agency=self.agency, full_name="Samir Ait Lahcen").exists())

    def test_contract_pdf_endpoint_returns_pdf_response(self):
        contract = self.create_contract()
        self.authenticate(self.owner)

        response = self.client.get(f"/api/contracts/{contract.id}/pdf/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
