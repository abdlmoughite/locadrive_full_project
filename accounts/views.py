from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
from accounts.serializers import (
    LocaDriveTokenObtainPairSerializer,
    LogoutSerializer,
    OwnerRegistrationSerializer,
    UserSerializer,
    UserWriteSerializer,
)
from common.permissions import IsAuthenticatedAndActive, IsAuthenticatedAndVerified, IsOwnerOrSuperAdmin


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LocaDriveTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class RegisterOwnerView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OwnerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Agency owner account created successfully and is pending verification.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticatedAndActive]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticatedAndActive]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("agency").all()
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {"role": ["exact"], "status": ["exact"], "agency": ["exact"]}
    search_fields = ["full_name", "email"]
    ordering_fields = ["created_at", "updated_at", "full_name", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.SUPERADMIN:
            return queryset
        if user.agency_id:
            return queryset.filter(agency=user.agency).exclude(role=User.Role.SUPERADMIN)
        return queryset.none()

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UserWriteSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "activate", "suspend"}:
            return [IsAuthenticatedAndVerified(), IsOwnerOrSuperAdmin()]
        return [permission() for permission in self.permission_classes]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role != User.Role.SUPERADMIN and obj.agency_id != user.agency_id:
            self.permission_denied(self.request, message="You cannot access users from another agency.")
        return obj

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        if request.user.role == User.Role.AGENCY_OWNER and user.role != User.Role.AGENCY_AGENT:
            self.permission_denied(request, message="Owners can only activate agents.")
        user.status = User.Status.ACTIVE
        user.save(update_fields=["status", "is_active", "updated_at"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        if request.user.role == User.Role.AGENCY_OWNER and user.role != User.Role.AGENCY_AGENT:
            self.permission_denied(request, message="Owners can only suspend agents.")
        user.status = User.Status.SUSPENDED
        user.save(update_fields=["status", "is_active", "updated_at"])
        return Response(UserSerializer(user).data)
