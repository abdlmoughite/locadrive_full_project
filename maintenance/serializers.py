from rest_framework import serializers

from common.serializers import AgencyOwnedSerializerMixin
from maintenance.models import Incident, Maintenance


class MaintenanceSerializer(AgencyOwnedSerializerMixin):
    estimated_end_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Maintenance
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "updated_at")

    STATUS_ALIASES = {
        "PENDING": Maintenance.Status.SCHEDULED,
        "SCHEDULED": Maintenance.Status.SCHEDULED,
        "IN_PROGRESS": Maintenance.Status.IN_PROGRESS,
        "COMPLETED": Maintenance.Status.COMPLETED,
        "CANCELLED": Maintenance.Status.CANCELLED,
    }

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, "copy") else dict(data)
        raw_status = mutable_data.get("status")
        if raw_status:
            normalized_status = str(raw_status).strip().upper().replace("-", "_").replace(" ", "_")
            mutable_data["status"] = self.STATUS_ALIASES.get(normalized_status, raw_status)
        return super().to_internal_value(mutable_data)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        car = attrs.get("car", getattr(self.instance, "car", None))
        started_at = attrs.get("started_at", getattr(self.instance, "started_at", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})
        if car and car.agency != agency:
            raise serializers.ValidationError({"car": "Car must belong to the same agency."})
        if car and not car.is_active:
            raise serializers.ValidationError({"car": "Inactive cars cannot be assigned to maintenance operations."})
        if started_at:
            attrs["maintenance_date"] = started_at.date()
        return attrs


class IncidentSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})
        for related_name in ("contract", "client", "car"):
            related_obj = attrs.get(related_name, getattr(self.instance, related_name, None))
            if related_obj and getattr(related_obj, "agency_id", None) != agency.id:
                raise serializers.ValidationError({related_name: f"{related_name.title()} must belong to the same agency."})
        return attrs
