from rest_framework import serializers

from common.serializers import AgencyOwnedSerializerMixin
from fleet.models import Car, CarDocument, CarHistoryEvent


class CarSerializer(AgencyOwnedSerializerMixin):
    NORMALIZED_CHOICE_FIELDS = {
        "fuel_type": Car.FuelType.choices,
        "transmission": Car.Transmission.choices,
        "status": Car.Status.choices,
    }

    class Meta:
        model = Car
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at", "is_active")

    @staticmethod
    def _normalize_choice_value(raw_value, choices):
        if raw_value in (None, ""):
            return raw_value

        normalized_raw = str(raw_value).strip().upper().replace("-", "_").replace(" ", "_")
        for value, label in choices:
            normalized_value = str(value).upper().replace("-", "_").replace(" ", "_")
            normalized_label = str(label).upper().replace("-", "_").replace(" ", "_")
            if normalized_raw in {normalized_value, normalized_label}:
                return value
        return raw_value

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False) and getattr(user, "role", None) != "SUPERADMIN":
            fields["agency"].read_only = True
        return fields

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, "copy") else dict(data)
        for field_name, choices in self.NORMALIZED_CHOICE_FIELDS.items():
            if field_name in mutable_data:
                mutable_data[field_name] = self._normalize_choice_value(mutable_data[field_name], choices)
        return super().to_internal_value(mutable_data)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        if user.role != "SUPERADMIN":
            if user.agency is None:
                raise serializers.ValidationError(
                    {"agency": "No agency is linked to this account. Please contact support."}
                )
            attrs["agency"] = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required for superadmin car management."})
        return attrs


class CarDocumentSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = CarDocument
        fields = "__all__"
        read_only_fields = ("created_at",)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        car = attrs.get("car", getattr(self.instance, "car", None))
        if car is None:
            raise serializers.ValidationError({"car": "Car is required."})
        attrs["agency"] = car.agency if user.role == "SUPERADMIN" else user.agency
        if attrs["agency"] != car.agency:
            raise serializers.ValidationError({"car": "Car must belong to the same agency."})
        return attrs


class CarHistoryEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = CarHistoryEvent
        fields = "__all__"


class CarAvailabilitySerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, attrs):
        if attrs["end_date"] <= attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs
