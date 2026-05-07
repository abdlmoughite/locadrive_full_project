from agencies.models import Agency
from rest_framework import serializers


class AgencyOwnedSerializerMixin(serializers.ModelSerializer):
    agency = serializers.PrimaryKeyRelatedField(queryset=Agency.objects.all(), required=False)
