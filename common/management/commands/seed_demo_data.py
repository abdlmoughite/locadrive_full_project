from datetime import timedelta
from decimal import Decimal

from django.apps import apps
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from agencies.models import Agency, Subscription
from bookings.models import Contract, Reservation
from bookings.services import BookingService
from clients.models import Client
from clients.services import ClientService
from finance.models import Deposit, Expense, Invoice, Payment
from finance.services import FinanceService
from fleet.models import Car
from maintenance.models import Incident, Maintenance
from maintenance.services import MaintenanceService


class Command(BaseCommand):
    help = "Seed realistic Moroccan demo data for the LocaDrive SaaS project."

    demo_password = "Test12345!"
    demo_emails = [
        "admin@locadrive.test",
        "owner@locadrive.test",
        "agent@locadrive.test",
        "ops.agent@locadrive.test",
        "pending.owner@locadrive.test",
    ]

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete old demo data before recreating it.")

    def handle(self, *args, **options):
        if options["clear"]:
            self.clear_demo_data()

        today = timezone.localdate()
        verified_agency = self.ensure_agency(
            name="Atlas Drive Casablanca",
            phone="0665113076",
            email="owner@locadrive.test",
            address="29 Boulevard Zerktouni, Casablanca",
            subscription_status=Agency.SubscriptionStatus.ACTIVE,
        )
        pending_agency = self.ensure_agency(
            name="Marrakech Pending Mobility",
            phone="0645678901",
            email="pending.owner@locadrive.test",
            address="Avenue Mohammed VI, Marrakech",
            subscription_status=Agency.SubscriptionStatus.PAST_DUE,
        )

        admin_user = self.ensure_superadmin("admin@locadrive.test", "LocaDrive Admin")
        verified_owner = self.ensure_user(
            email="owner@locadrive.test",
            full_name="Omar El Idrissi",
            agency=verified_agency,
            role=User.Role.AGENCY_OWNER,
            is_verified=True,
        )
        agent_user = self.ensure_user(
            email="agent@locadrive.test",
            full_name="Salma Benkirane",
            agency=verified_agency,
            role=User.Role.AGENCY_AGENT,
            is_verified=True,
        )
        self.ensure_user(
            email="ops.agent@locadrive.test",
            full_name="Karim Lahlou",
            agency=verified_agency,
            role=User.Role.AGENCY_AGENT,
            is_verified=True,
        )
        pending_owner = self.ensure_user(
            email="pending.owner@locadrive.test",
            full_name="Amina Bennis",
            agency=pending_agency,
            role=User.Role.AGENCY_OWNER,
            is_verified=False,
        )

        self.ensure_subscription(
            agency=verified_agency,
            plan_name="Growth",
            price=Decimal("2499.00"),
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=345),
            status=Subscription.Status.ACTIVE,
        )
        self.ensure_subscription(
            agency=pending_agency,
            plan_name="Starter",
            price=Decimal("1499.00"),
            start_date=today - timedelta(days=40),
            end_date=today + timedelta(days=20),
            status=Subscription.Status.PAST_DUE,
        )

        cars = self.ensure_cars(verified_agency)
        self.ensure_pending_agency_car(pending_agency)
        clients = self.ensure_clients(verified_agency)
        self.ensure_pending_agency_client(pending_agency)
        self.ensure_client_flags(clients["noura"], verified_owner)

        reservations = self.ensure_reservations(
            agency=verified_agency,
            cars=cars,
            clients=clients,
            actor=agent_user,
            today=today,
        )
        contracts = self.ensure_contracts(
            agency=verified_agency,
            cars=cars,
            clients=clients,
            owner=verified_owner,
            agent=agent_user,
            today=today,
        )
        self.ensure_finance_records(
            agency=verified_agency,
            contracts=contracts,
            clients=clients,
            owner=verified_owner,
            agent=agent_user,
            today=today,
        )
        self.ensure_maintenance_and_incidents(
            agency=verified_agency,
            cars=cars,
            contracts=contracts,
            clients=clients,
            actor=agent_user,
            today=today,
        )

        self.report_optional_modules()

        self.stdout.write(self.style.SUCCESS("Demo data seeding completed successfully."))
        self.stdout.write("")
        self.stdout.write("Credentials:")
        self.stdout.write(f"  Admin:         admin@locadrive.test / {self.demo_password}")
        self.stdout.write(f"  Verified owner: owner@locadrive.test / {self.demo_password}")
        self.stdout.write(f"  Agent:         agent@locadrive.test / {self.demo_password}")
        self.stdout.write(f"  Pending owner: pending.owner@locadrive.test / {self.demo_password}")
        self.stdout.write("")
        self.stdout.write("Status:")
        self.stdout.write(f"  Verified owner agency: {verified_agency.name}")
        self.stdout.write(f"  Pending owner agency:  {pending_agency.name}")
        self.stdout.write(f"  Cars: {Car.objects.filter(agency=verified_agency).count()} | Clients: {Client.objects.filter(agency=verified_agency).count()}")
        self.stdout.write(
            f"  Reservations: {Reservation.objects.filter(agency=verified_agency).count()} | Contracts: {Contract.objects.filter(agency=verified_agency).count()}"
        )
        self.stdout.write(
            f"  Invoices: {Invoice.objects.filter(agency=verified_agency).count()} | Payments: {Payment.objects.filter(agency=verified_agency).count()}"
        )

    def clear_demo_data(self):
        agencies_to_delete = Agency.objects.filter(email__in=["owner@locadrive.test", "pending.owner@locadrive.test"])
        agency_count = agencies_to_delete.count()
        agencies_to_delete.delete()
        user_count, _ = User.objects.filter(email__in=self.demo_emails).delete()
        self.stdout.write(self.style.WARNING(f"Cleared {agency_count} demo agencies and {user_count} demo user records."))

    def ensure_agency(self, *, name, phone, email, address, subscription_status):
        agency, created = Agency.objects.update_or_create(
            email=email,
            defaults={
                "name": name,
                "phone": phone,
                "address": address,
                "subscription_status": subscription_status,
            },
        )
        self.stdout.write(f"{'Created' if created else 'Updated'} agency: {agency.name}")
        return agency

    def ensure_superadmin(self, email, full_name):
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_superuser(email=email, password=self.demo_password, full_name=full_name)
            self.stdout.write("Created superadmin demo account.")
            return user

        user.full_name = full_name
        user.role = User.Role.SUPERADMIN
        user.status = User.Status.ACTIVE
        user.is_staff = True
        user.is_superuser = True
        user.is_verified = True
        user.agency = None
        user.set_password(self.demo_password)
        user.full_clean()
        user.save()
        self.stdout.write("Updated superadmin demo account.")
        return user

    def ensure_user(self, *, email, full_name, agency, role, is_verified):
        user = User.objects.filter(email=email).first()
        created = user is None
        if created:
            user = User.objects.create_user(
                email=email,
                password=self.demo_password,
                full_name=full_name,
                agency=agency,
                role=role,
                status=User.Status.ACTIVE,
                is_verified=is_verified,
            )
        else:
            user.full_name = full_name
            user.agency = agency
            user.role = role
            user.status = User.Status.ACTIVE
            user.is_verified = is_verified
            user.set_password(self.demo_password)
            user.full_clean()
            user.save()
        self.stdout.write(f"{'Created' if created else 'Updated'} user: {email}")
        return user

    def ensure_subscription(self, *, agency, plan_name, price, start_date, end_date, status):
        subscription, created = Subscription.objects.update_or_create(
            agency=agency,
            status=status,
            defaults={
                "plan_name": plan_name,
                "price": price,
                "start_date": start_date,
                "end_date": end_date,
            },
        )
        if agency.subscription_status != status:
            agency.subscription_status = status
            agency.save(update_fields=["subscription_status", "updated_at"])
        self.stdout.write(f"{'Created' if created else 'Updated'} subscription for {agency.name}.")
        return subscription

    def ensure_cars(self, agency):
        car_specs = [
            {
                "key": "dacia",
                "brand": "Dacia",
                "model": "Duster",
                "plate_number": "123456-A-1",
                "year": 2024,
                "color": "Sand",
                "fuel_type": Car.FuelType.DIESEL,
                "transmission": Car.Transmission.MANUAL,
                "daily_price": Decimal("420.00"),
                "deposit_amount": Decimal("3000.00"),
                "mileage": 45200,
                "status": Car.Status.AVAILABLE,
            },
            {
                "key": "hyundai",
                "brand": "Hyundai",
                "model": "Tucson",
                "plate_number": "223456-A-2",
                "year": 2025,
                "color": "Black",
                "fuel_type": Car.FuelType.DIESEL,
                "transmission": Car.Transmission.AUTOMATIC,
                "daily_price": Decimal("650.00"),
                "deposit_amount": Decimal("5000.00"),
                "mileage": 28800,
                "status": Car.Status.AVAILABLE,
            },
            {
                "key": "renault",
                "brand": "Renault",
                "model": "Clio",
                "plate_number": "323456-A-3",
                "year": 2024,
                "color": "Blue",
                "fuel_type": Car.FuelType.PETROL,
                "transmission": Car.Transmission.MANUAL,
                "daily_price": Decimal("300.00"),
                "deposit_amount": Decimal("2000.00"),
                "mileage": 16200,
                "status": Car.Status.AVAILABLE,
            },
            {
                "key": "peugeot",
                "brand": "Peugeot",
                "model": "208",
                "plate_number": "423456-A-4",
                "year": 2023,
                "color": "White",
                "fuel_type": Car.FuelType.PETROL,
                "transmission": Car.Transmission.MANUAL,
                "daily_price": Decimal("320.00"),
                "deposit_amount": Decimal("2200.00"),
                "mileage": 21450,
                "status": Car.Status.AVAILABLE,
            },
            {
                "key": "kia",
                "brand": "Kia",
                "model": "Sportage",
                "plate_number": "523456-A-5",
                "year": 2025,
                "color": "Grey",
                "fuel_type": Car.FuelType.HYBRID,
                "transmission": Car.Transmission.AUTOMATIC,
                "daily_price": Decimal("680.00"),
                "deposit_amount": Decimal("5500.00"),
                "mileage": 9750,
                "status": Car.Status.MAINTENANCE,
            },
            {
                "key": "toyota",
                "brand": "Toyota",
                "model": "Corolla",
                "plate_number": "623456-A-6",
                "year": 2024,
                "color": "Silver",
                "fuel_type": Car.FuelType.HYBRID,
                "transmission": Car.Transmission.AUTOMATIC,
                "daily_price": Decimal("560.00"),
                "deposit_amount": Decimal("4000.00"),
                "mileage": 19800,
                "status": Car.Status.AVAILABLE,
            },
        ]
        cars = {}
        for spec in car_specs:
            car, created = Car.objects.update_or_create(
                agency=agency,
                plate_number=spec["plate_number"],
                defaults={key: value for key, value in spec.items() if key != "key"},
            )
            cars[spec["key"]] = car
            self.stdout.write(f"{'Created' if created else 'Updated'} car: {car}")
        return cars

    def ensure_pending_agency_car(self, agency):
        car, created = Car.objects.update_or_create(
            agency=agency,
            plate_number="723456-B-7",
            defaults={
                "brand": "Dacia",
                "model": "Logan",
                "year": 2024,
                "color": "White",
                "fuel_type": Car.FuelType.PETROL,
                "transmission": Car.Transmission.MANUAL,
                "daily_price": Decimal("260.00"),
                "deposit_amount": Decimal("1500.00"),
                "mileage": 8000,
                "status": Car.Status.AVAILABLE,
            },
        )
        self.stdout.write(f"{'Created' if created else 'Updated'} pending-agency car: {car}")
        return car

    def ensure_clients(self, agency):
        client_specs = [
            ("yassine", "Yassine El Amrani", "0612345678", "yassine@locadrive.test", "EE123451"),
            ("sara", "Sara Benali", "0623456789", "sara@locadrive.test", "EE123452"),
            ("mehdi", "Mehdi Berrada", "0634567890", "mehdi@locadrive.test", "EE123453"),
            ("imane", "Imane Alaoui", "0645678901", "imane@locadrive.test", "EE123454"),
            ("hamza", "Hamza Tazi", "0656789012", "hamza@locadrive.test", "EE123455"),
            ("noura", "Noura El Fassi", "0665113076", "noura@locadrive.test", "EE123456"),
        ]
        clients = {}
        for key, full_name, phone, email, cin in client_specs:
            client, created = Client.objects.update_or_create(
                agency=agency,
                cin=cin,
                defaults={
                    "full_name": full_name,
                    "phone": phone,
                    "email": email,
                    "passport": "",
                    "driving_license": f"DL-{cin}",
                    "address": "Casablanca, Morocco",
                    "status": Client.Status.ACTIVE,
                    "blacklisted": False,
                    "blacklist_reason": "",
                    "blacklist_note": "",
                },
            )
            clients[key] = client
            self.stdout.write(f"{'Created' if created else 'Updated'} client: {client.full_name}")
        return clients

    def ensure_pending_agency_client(self, agency):
        client, created = Client.objects.update_or_create(
            agency=agency,
            cin="MA900001",
            defaults={
                "full_name": "Rachid Bensouda",
                "phone": "0671234567",
                "email": "rachid.pending@locadrive.test",
                "passport": "",
                "driving_license": "DL-MA900001",
                "address": "Marrakech, Morocco",
            },
        )
        self.stdout.write(f"{'Created' if created else 'Updated'} pending-agency client: {client.full_name}")
        return client

    def ensure_client_flags(self, client, actor):
        if not client.blacklist_logs.filter(action="WARNING_ADDED").exists():
            ClientService.add_warning(
                client=client,
                reason="Repeated late returns",
                note="Customer received a formal warning after multiple delayed returns.",
                actor=actor,
            )
        if not client.blacklisted:
            ClientService.blacklist_client(
                client=client,
                reason="Outstanding unpaid incident fees",
                note="Blacklisted until outstanding damages are settled.",
                actor=actor,
            )

    def ensure_reservations(self, *, agency, cars, clients, actor, today):
        reservations = {}
        reservations["pending"] = self.ensure_reservation(
            agency=agency,
            client=clients["sara"],
            car=cars["renault"],
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=6),
            advance_amount=Decimal("150.00"),
            target_status=Reservation.Status.PENDING,
            actor=actor,
        )
        reservations["confirmed"] = self.ensure_reservation(
            agency=agency,
            client=clients["mehdi"],
            car=cars["peugeot"],
            start_date=today + timedelta(days=8),
            end_date=today + timedelta(days=11),
            advance_amount=Decimal("200.00"),
            target_status=Reservation.Status.CONFIRMED,
            actor=actor,
        )
        reservations["cancelled"] = self.ensure_reservation(
            agency=agency,
            client=clients["imane"],
            car=cars["hyundai"],
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=18),
            advance_amount=Decimal("100.00"),
            target_status=Reservation.Status.CANCELLED,
            actor=actor,
        )
        return reservations

    def ensure_reservation(self, *, agency, client, car, start_date, end_date, advance_amount, target_status, actor):
        reservation = Reservation.objects.filter(
            agency=agency,
            client=client,
            car=car,
            start_date=start_date,
            end_date=end_date,
        ).first()
        if reservation is None:
            reservation = BookingService.create_reservation(
                agency=agency,
                client=client,
                car=car,
                start_date=start_date,
                end_date=end_date,
                advance_amount=advance_amount,
                created_by=actor,
            )
            self.stdout.write(f"Created reservation for {client.full_name} ({target_status}).")
        if target_status == Reservation.Status.CONFIRMED and reservation.status != Reservation.Status.CONFIRMED:
            BookingService.confirm_reservation(reservation, actor)
        elif target_status == Reservation.Status.CANCELLED and reservation.status != Reservation.Status.CANCELLED:
            BookingService.cancel_reservation(reservation, actor)
        return reservation

    def ensure_contracts(self, *, agency, cars, clients, owner, agent, today):
        contracts = {}
        contracts["active"] = self.ensure_contract(
            agency=agency,
            client=clients["yassine"],
            car=cars["toyota"],
            start_date=today - timedelta(days=1),
            expected_return_date=today + timedelta(days=3),
            daily_price=Decimal("560.00"),
            start_mileage=19800,
            start_fuel_level=Decimal("100.00"),
            actor=owner,
            activate=True,
        )
        contracts["draft"] = self.ensure_contract(
            agency=agency,
            client=clients["imane"],
            car=cars["hyundai"],
            start_date=today + timedelta(days=5),
            expected_return_date=today + timedelta(days=8),
            daily_price=Decimal("650.00"),
            start_mileage=28800,
            start_fuel_level=Decimal("100.00"),
            actor=owner,
        )
        contracts["completed"] = self.ensure_contract(
            agency=agency,
            client=clients["hamza"],
            car=cars["dacia"],
            start_date=today - timedelta(days=12),
            expected_return_date=today - timedelta(days=9),
            daily_price=Decimal("420.00"),
            start_mileage=45200,
            start_fuel_level=Decimal("100.00"),
            actor=agent,
            activate=True,
            complete_kwargs={
                "actual_return_date": today - timedelta(days=8),
                "return_mileage": 45680,
                "return_fuel_level": Decimal("72.00"),
                "late_fee": Decimal("0.00"),
                "damage_fee": Decimal("250.00"),
                "fuel_fee": Decimal("0.00"),
                "maintenance_required": False,
            },
        )
        return contracts

    def ensure_contract(
        self,
        *,
        agency,
        client,
        car,
        start_date,
        expected_return_date,
        daily_price,
        start_mileage,
        start_fuel_level,
        actor,
        activate=False,
        complete_kwargs=None,
    ):
        contract = Contract.objects.filter(
            agency=agency,
            client=client,
            car=car,
            start_date=start_date,
            expected_return_date=expected_return_date,
        ).first()
        if contract is None:
            contract = BookingService.create_contract(
                agency=agency,
                client=client,
                car=car,
                start_date=start_date,
                expected_return_date=expected_return_date,
                daily_price=daily_price,
                start_mileage=start_mileage,
                start_fuel_level=start_fuel_level,
                created_by=actor,
                discount_amount=Decimal("0.00"),
                extra_fees=Decimal("0.00"),
                activate_now=False,
            )
            self.stdout.write(f"Created contract {contract.contract_number}.")

        if activate and contract.status == Contract.Status.DRAFT:
            BookingService.activate_contract(contract, actor)
        elif activate and contract.status in {Contract.Status.ACTIVE, Contract.Status.OVERDUE} and contract.car.status != Car.Status.RENTED:
            contract.car.status = Car.Status.RENTED
            contract.car.save(update_fields=["status", "updated_at"])

        if complete_kwargs and contract.status != Contract.Status.COMPLETED:
            if contract.status == Contract.Status.DRAFT:
                BookingService.activate_contract(contract, actor)
            BookingService.complete_contract(contract, actor, **complete_kwargs)

        contract.refresh_from_db()
        return contract

    def ensure_finance_records(self, *, agency, contracts, clients, owner, agent, today):
        active_contract = contracts["active"]
        completed_contract = contracts["completed"]

        if not active_contract.deposits.exists():
            FinanceService.create_deposit(
                contract=active_contract,
                amount=Decimal("4000.00"),
                payment_method=Payment.Method.CASH,
                created_by=agent,
                notes="Security deposit / Daman received on pickup.",
            )

        active_rental_invoice = active_contract.invoices.filter(type=Invoice.Type.RENTAL_INVOICE).first()
        if active_rental_invoice and not Payment.objects.filter(reference="PAY-ACTIVE-RENTAL-001").exists():
            FinanceService.pay_invoice(
                invoice=active_rental_invoice,
                amount=Decimal("560.00"),
                method=Payment.Method.CARD,
                created_by=agent,
                reference="PAY-ACTIVE-RENTAL-001",
                notes="Initial rental payment received by card.",
            )

        completed_rental_invoice = completed_contract.invoices.filter(type=Invoice.Type.RENTAL_INVOICE).first()
        if completed_rental_invoice and completed_rental_invoice.remaining_amount > 0 and not Payment.objects.filter(reference="PAY-COMPLETED-RENTAL-001").exists():
            FinanceService.pay_invoice(
                invoice=completed_rental_invoice,
                amount=completed_rental_invoice.remaining_amount,
                method=Payment.Method.BANK_TRANSFER,
                created_by=owner,
                reference="PAY-COMPLETED-RENTAL-001",
                notes="Completed contract settled in full.",
            )

        office_expense = Expense.objects.filter(agency=agency, title="Agency office rent - Casablanca").first()
        if office_expense is None:
            FinanceService.create_expense(
                agency=agency,
                category=Expense.Category.RENT_OFFICE,
                title="Agency office rent - Casablanca",
                amount=Decimal("2500.00"),
                payment_method=Payment.Method.BANK_TRANSFER,
                created_by=owner,
                description="Monthly office rent for the Casablanca branch.",
                supplier_name="Immo Atlas",
                expense_date=today.replace(day=1),
            )

        cleaning_expense = Expense.objects.filter(agency=agency, title="Fleet cleaning supplies").first()
        if cleaning_expense is None:
            FinanceService.create_expense(
                agency=agency,
                category=Expense.Category.CLEANING,
                title="Fleet cleaning supplies",
                amount=Decimal("480.00"),
                payment_method=Payment.Method.CASH,
                created_by=agent,
                description="Cleaning supplies for vehicle preparation and delivery.",
                supplier_name="Casanet Services",
                expense_date=today - timedelta(days=2),
                car=contracts["active"].car,
            )

        FinanceService.update_client_financials(clients["yassine"])
        FinanceService.update_client_financials(clients["hamza"])

    def ensure_maintenance_and_incidents(self, *, agency, cars, contracts, clients, actor, today):
        maintenance = Maintenance.objects.filter(agency=agency, car=cars["kia"], type="Engine diagnostics").first()
        if maintenance is None:
            maintenance = Maintenance.objects.create(
                agency=agency,
                car=cars["kia"],
                type="Engine diagnostics",
                description="Vehicle flagged for a dashboard alert and preventive inspection.",
                cost=Decimal("0.00"),
                maintenance_date=today - timedelta(days=1),
                next_maintenance_date=today + timedelta(days=30),
                status=Maintenance.Status.IN_PROGRESS,
                created_by=actor,
            )
            MaintenanceService.create_maintenance_record(maintenance)

        incident = Incident.objects.filter(
            agency=agency,
            contract=contracts["active"],
            type=Incident.Type.DAMAGE,
            description="Front bumper scratch recorded during vehicle return inspection.",
        ).first()
        if incident is None:
            incident = Incident.objects.create(
                agency=agency,
                contract=contracts["active"],
                client=clients["yassine"],
                car=contracts["active"].car,
                type=Incident.Type.DAMAGE,
                description="Front bumper scratch recorded during vehicle return inspection.",
                amount=Decimal("700.00"),
                status=Incident.Status.OPEN,
                created_by=actor,
            )
            MaintenanceService.create_incident(incident)

    def report_optional_modules(self):
        optional_apps = {
            "messaging": "Messaging conversations",
            "notifications": "Notifications",
        }
        for app_label, label in optional_apps.items():
            if not apps.is_installed(app_label):
                self.stdout.write(self.style.WARNING(f"{label} app is not installed; skipping demo {label.lower()} data."))
