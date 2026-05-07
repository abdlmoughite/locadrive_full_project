from rest_framework import serializers

from agencies.models import Agency, Subscription


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    agency = serializers.PrimaryKeyRelatedField(queryset=Agency.objects.all(), required=False)

    class Meta:
        model = Subscription
        fields = "__all__"

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs
