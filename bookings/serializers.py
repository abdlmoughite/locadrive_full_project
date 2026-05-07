from decimal import Decimal

from rest_framework import serializers

from agencies.models import Agency
from bookings.models import Contract, Reservation
from clients.services import check_duplicate_client
from clients.models import Client
from common.serializers import AgencyOwnedSerializerMixin
from fleet.models import Car
from fleet.services import FleetService


class ReservationSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = ("estimated_total", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        client = attrs.get("client", getattr(self.instance, "client", None))
        car = attrs.get("car", getattr(self.instance, "car", None))
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})

        if client and client.agency != agency:
            raise serializers.ValidationError({"client": "Client must belong to the same agency."})
        if car and car.agency != agency:
            raise serializers.ValidationError({"car": "Car must belong to the same agency."})
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        if car and start_date and end_date:
            if not FleetService.check_car_availability(car, start_date, end_date, exclude_reservation=self.instance):
                raise serializers.ValidationError({"car": "Car is not available for the selected dates."})
        return attrs


class ReservationCreateSerializer(serializers.Serializer):
    agency = serializers.PrimaryKeyRelatedField(queryset=Agency.objects.all(), required=False)
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all(), required=False, allow_null=True)
    car = serializers.PrimaryKeyRelatedField(queryset=Car.objects.all())
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    advance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    new_client = serializers.DictField(required=False)

    REQUIRED_NEW_CLIENT_FIELDS = ("full_name", "phone")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False) and user.role != "SUPERADMIN":
            self.fields["client"].queryset = Client.objects.filter(agency=user.agency)
            self.fields["car"].queryset = Car.objects.filter(agency=user.agency, is_active=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency") if user.role == "SUPERADMIN" else user.agency
        client = attrs.get("client")
        new_client = attrs.get("new_client")
        if user.role == "SUPERADMIN" and agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})
        if attrs["end_date"] <= attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        if attrs["advance_amount"] < 0:
            raise serializers.ValidationError({"advance_amount": "Advance amount cannot be negative."})
        if bool(client) == bool(new_client):
            raise serializers.ValidationError(
                {"client": "Choose an existing client or create a new client, but not both."}
            )
        if client and client.agency_id != agency.id:
            raise serializers.ValidationError({"client": "Client must belong to the selected agency."})
        if attrs["car"].agency_id != agency.id:
            raise serializers.ValidationError({"car": "Car must belong to the selected agency."})
        if not attrs["car"].is_active:
            raise serializers.ValidationError({"car": "Inactive cars cannot be reserved."})
        if new_client:
            missing_fields = [field for field in self.REQUIRED_NEW_CLIENT_FIELDS if not str(new_client.get(field, "")).strip()]
            if missing_fields:
                raise serializers.ValidationError(
                    {"new_client": f"Missing required client fields: {', '.join(missing_fields)}."}
                )
            duplicates = check_duplicate_client(
                agency=agency,
                cin=new_client.get("cin", ""),
                driving_license=new_client.get("driving_license", ""),
                passport=new_client.get("passport", ""),
            )
            duplicate_fields = [
                field_name
                for field_name in ("cin", "driving_license", "passport")
                if duplicates["matches"].get(field_name)
            ]
            if duplicate_fields:
                raise serializers.ValidationError(
                    {"new_client": f"A client with the same {', '.join(duplicate_fields)} already exists."}
                )
        return attrs


class ReservationConvertSerializer(serializers.Serializer):
    daily_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    start_mileage = serializers.IntegerField(required=False)
    start_fuel_level = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    extra_fees = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    blacklist_override_reason = serializers.CharField(required=False, allow_blank=True)
    activate_now = serializers.BooleanField(required=False, default=False)


class ContractSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = Contract
        fields = "__all__"
        read_only_fields = (
            "contract_number",
            "days_count",
            "subtotal",
            "total_amount",
            "paid_amount",
            "remaining_amount",
            "created_by",
            "created_at",
            "updated_at",
        )


class ContractCreateSerializer(serializers.Serializer):
    agency = serializers.PrimaryKeyRelatedField(queryset=Agency.objects.all(), required=False)
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())
    car = serializers.PrimaryKeyRelatedField(queryset=Car.objects.all())
    start_date = serializers.DateField()
    expected_return_date = serializers.DateField()
    daily_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    start_mileage = serializers.IntegerField()
    start_fuel_level = serializers.DecimalField(max_digits=5, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    extra_fees = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    blacklist_override_reason = serializers.CharField(required=False, allow_blank=True)
    activate_now = serializers.BooleanField(required=False, default=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False) and user.role != "SUPERADMIN":
            self.fields["client"].queryset = Client.objects.filter(agency=user.agency)
            self.fields["car"].queryset = Car.objects.filter(agency=user.agency, is_active=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency") if user.role == "SUPERADMIN" else user.agency
        if user.role == "SUPERADMIN" and agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})
        if attrs["expected_return_date"] <= attrs["start_date"]:
            raise serializers.ValidationError({"expected_return_date": "Expected return date must be after start date."})
        if attrs["discount_amount"] < 0 or attrs["extra_fees"] < 0:
            raise serializers.ValidationError("Money amounts cannot be negative.")
        if attrs["client"].agency_id != agency.id:
            raise serializers.ValidationError({"client": "Client must belong to the selected agency."})
        if attrs["car"].agency_id != agency.id:
            raise serializers.ValidationError({"car": "Car must belong to the selected agency."})
        if not attrs["car"].is_active:
            raise serializers.ValidationError({"car": "Inactive cars cannot be assigned to contracts."})
        return attrs


class ContractUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ("expected_return_date", "start_mileage", "start_fuel_level", "blacklist_override_reason")

    def validate(self, attrs):
        expected_return_date = attrs.get("expected_return_date", self.instance.expected_return_date)
        if expected_return_date <= self.instance.start_date:
            raise serializers.ValidationError({"expected_return_date": "Expected return date must be after start date."})
        return attrs


class ContractCompleteSerializer(serializers.Serializer):
    actual_return_date = serializers.DateField()
    return_mileage = serializers.IntegerField()
    return_fuel_level = serializers.DecimalField(max_digits=5, decimal_places=2)
    late_fee = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    damage_fee = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    fuel_fee = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    maintenance_required = serializers.BooleanField(required=False, default=False)


class ContractDepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=[
        ("CASH", "Cash"),
        ("CARD", "Card"),
        ("BANK_TRANSFER", "Bank transfer"),
        ("CHEQUE", "Cheque"),
        ("ONLINE", "Online"),
    ])
    notes = serializers.CharField(required=False, allow_blank=True)
