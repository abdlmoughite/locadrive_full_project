from django.db import transaction

from agencies.models import Agency
from accounts.models import User
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class AgencySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("id", "name")


class UserSerializer(serializers.ModelSerializer):
    agency = AgencySummarySerializer(read_only=True)
    verification_status = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "agency",
            "full_name",
            "email",
            "role",
            "status",
            "is_verified",
            "verification_status",
            "is_staff",
            "is_active",
            "date_joined",
            "created_at",
            "updated_at",
        )


class UserWriteSerializer(serializers.ModelSerializer):
    agency = serializers.PrimaryKeyRelatedField(queryset=Agency.objects.all(), required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ("id", "agency", "full_name", "email", "password", "role", "status")

    def validate(self, attrs):
        request = self.context["request"]
        actor = request.user
        target_role = attrs.get("role", getattr(self.instance, "role", None))
        target_agency = attrs.get("agency", getattr(self.instance, "agency", None))

        if actor.role == User.Role.SUPERADMIN:
            if target_role == User.Role.SUPERADMIN:
                attrs["agency"] = None
            elif target_role in {User.Role.AGENCY_OWNER, User.Role.AGENCY_AGENT} and target_agency is None:
                raise serializers.ValidationError({"agency": "Agency is required for agency users."})
        elif actor.role == User.Role.AGENCY_OWNER:
            if self.instance and self.instance.role != User.Role.AGENCY_AGENT:
                raise PermissionDenied("Agency owners can only manage agents.")
            if target_role != User.Role.AGENCY_AGENT:
                raise PermissionDenied("Agency owners can only create or update agents.")
            attrs["agency"] = actor.agency
        else:
            raise PermissionDenied("You do not have permission to manage users.")

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LocaDriveTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class OwnerRegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    agency_name = serializers.CharField(max_length=255)
    agency_phone = serializers.CharField(max_length=50)
    agency_address = serializers.CharField(required=False, allow_blank=True)
    agency_city = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        normalized_email = User.objects.normalize_email(attrs["email"])
        attrs["email"] = normalized_email
        if User.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        if Agency.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError({"email": "An agency with this email already exists."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("confirm_password", None)
        agency_address = validated_data.pop("agency_address", "").strip()
        agency_city = validated_data.pop("agency_city", "").strip()

        address_parts = [value for value in [agency_address, agency_city] if value]
        agency = Agency.objects.create(
            name=validated_data.pop("agency_name"),
            phone=validated_data.pop("agency_phone"),
            email=validated_data["email"],
            address=", ".join(address_parts),
        )
        return User.objects.create_user(
            email=validated_data["email"],
            password=password,
            full_name=validated_data["full_name"],
            agency=agency,
            role=User.Role.AGENCY_OWNER,
            status=User.Status.ACTIVE,
            is_verified=False,
        )
