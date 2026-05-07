from clients.models import ClientHistoryEvent
from common.test_helpers import BaseAPITestCase


class ClientWorkflowTests(BaseAPITestCase):
    def test_duplicate_client_check_endpoint(self):
        self.authenticate(self.owner)

        response = self.client.get(
            "/api/clients/check/",
            {"cin": self.client_record.cin, "phone": self.client_record.phone},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["exists"])
        self.assertEqual(len(response.data["matches"]["cin"]), 1)

    def test_client_history_event_created_on_blacklist(self):
        self.authenticate(self.owner)

        response = self.client.post(
            f"/api/clients/{self.client_record.id}/blacklist/",
            {"reason": "Fraud", "note": "Repeated contract issues"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            ClientHistoryEvent.objects.filter(
                client=self.client_record,
                event_type="BLACKLIST",
                title="Client blacklisted",
            ).exists()
        )
