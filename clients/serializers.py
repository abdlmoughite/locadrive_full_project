from rest_framework import serializers

from clients.models import Client, ClientBlacklistLog, ClientHistoryEvent, ClientNote
from clients.services import check_duplicate_client
from common.serializers import AgencyOwnedSerializerMixin


class ClientSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = Client
        fields = "__all__"
        read_only_fields = (
            "blacklisted_at",
            "blacklisted_by",
            "total_spent",
            "total_debt",
            "total_contracts",
            "last_rental_date",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})

        duplicates = check_duplicate_client(
            agency=agency,
            cin=attrs.get("cin", getattr(self.instance, "cin", "")),
            driving_license=attrs.get("driving_license", getattr(self.instance, "driving_license", "")),
            passport=attrs.get("passport", getattr(self.instance, "passport", "")),
            exclude_client=self.instance,
        )
        for field in ("cin", "driving_license", "passport"):
            if duplicates["matches"].get(field):
                raise serializers.ValidationError({field: f"A client with this {field} already exists."})
        return attrs


class ClientNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientNote
        fields = "__all__"
        read_only_fields = ("agency", "client", "created_by", "created_at")


class ClientActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)


class ClientDuplicateCheckSerializer(serializers.Serializer):
    cin = serializers.CharField(required=False, allow_blank=True)
    driving_license = serializers.CharField(required=False, allow_blank=True)
    passport = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)


class ClientHistoryEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = ClientHistoryEvent
        fields = "__all__"


class ClientBlacklistLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = ClientBlacklistLog
        fields = "__all__"
