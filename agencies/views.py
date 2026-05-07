from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from agencies.models import Agency, Subscription
from agencies.serializers import AgencySerializer, SubscriptionSerializer
from common.permissions import IsAuthenticatedAndActive, IsAuthenticatedAndVerified, IsSuperAdmin


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.all().order_by("name")
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticatedAndVerified]
    search_fields = ["name", "email", "phone"]
    ordering_fields = ["created_at", "updated_at", "name"]

    def get_queryset(self):
        user = self.request.user
        if user.role == "SUPERADMIN":
            return Agency.objects.all().order_by("name")
        if user.agency_id:
            return Agency.objects.filter(id=user.agency_id)
        return Agency.objects.none()

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticatedAndVerified(), IsSuperAdmin()]
        return [permission() for permission in self.permission_classes]

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        if request.user.agency is None:
            return Response({"detail": "No agency is linked to this user."}, status=404)
        serializer = self.get_serializer(request.user.agency)
        return Response(serializer.data)


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related("agency").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {"status": ["exact"], "agency": ["exact"], "start_date": ["gte", "lte"]}
    search_fields = ["agency__name", "plan_name"]
    ordering_fields = ["created_at", "updated_at", "price", "start_date", "end_date", "status"]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == "SUPERADMIN":
            return queryset
        if user.agency_id:
            return queryset.filter(agency=user.agency)
        return queryset.none()

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticatedAndVerified(), IsSuperAdmin()]
        return [permission() for permission in self.permission_classes]
