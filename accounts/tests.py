from accounts.models import User
from common.test_helpers import BaseAPITestCase


class AuthenticationTests(BaseAPITestCase):
    def test_login_returns_jwt_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.owner.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], self.owner.email)

    def test_owner_can_create_agent(self):
        self.authenticate(self.owner)

        response = self.client.post(
            "/api/users/",
            {
                "full_name": "New Agent",
                "email": "new-agent@alpha.com",
                "password": self.password,
                "role": User.Role.AGENCY_AGENT,
                "status": User.Status.ACTIVE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email="new-agent@alpha.com")
        self.assertEqual(created_user.agency, self.agency)
        self.assertEqual(created_user.role, User.Role.AGENCY_AGENT)

    def test_owner_registration_creates_pending_owner(self):
        response = self.client.post(
            "/api/auth/register/owner/",
            {
                "full_name": "New Agency Owner",
                "email": "new-owner@locadrive.test",
                "password": "Test12345!",
                "confirm_password": "Test12345!",
                "agency_name": "New Atlas Cars",
                "agency_phone": "0665113076",
                "agency_address": "Boulevard Zerktouni",
                "agency_city": "Casablanca",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email="new-owner@locadrive.test")
        self.assertEqual(created_user.role, User.Role.AGENCY_OWNER)
        self.assertFalse(created_user.is_verified)
        self.assertEqual(created_user.verification_status, "PENDING")
        self.assertEqual(created_user.agency.name, "New Atlas Cars")

    def test_pending_owner_can_login_but_cannot_access_verified_endpoints(self):
        pending_owner = User.objects.create_user(
            email="pending-owner@alpha.com",
            password=self.password,
            full_name="Pending Alpha Owner",
            agency=self.agency,
            role=User.Role.AGENCY_OWNER,
            is_verified=False,
        )

        login_response = self.client.post(
            "/api/auth/login/",
            {"email": pending_owner.email, "password": self.password},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        access_token = login_response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertFalse(me_response.data["is_verified"])
        self.assertEqual(me_response.data["verification_status"], "PENDING")

        cars_response = self.client.get("/api/cars/")
        self.assertEqual(cars_response.status_code, 403)
