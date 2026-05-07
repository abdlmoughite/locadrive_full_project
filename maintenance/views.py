from common.mixins import AgencyScopedQuerysetMixin, AuditCreateUpdateMixin
from common.permissions import IsAuthenticatedAndVerified
from maintenance.models import Incident, Maintenance
from maintenance.serializers import IncidentSerializer, MaintenanceSerializer
from maintenance.services import MaintenanceService
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class MaintenanceViewSet(AgencyScopedQuerysetMixin, AuditCreateUpdateMixin, viewsets.ModelViewSet):
    queryset = Maintenance.objects.select_related("agency", "car", "created_by").all()
    serializer_class = MaintenanceSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "car": ["exact"],
        "agency": ["exact"],
        "started_at": ["gte", "lte"],
        "estimated_duration_hours": ["gte", "lte"],
        "maintenance_date": ["gte", "lte"],
        "next_maintenance_date": ["gte", "lte"],
    }
    search_fields = ["type", "description", "car__plate_number", "car__brand", "car__model"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "started_at",
        "estimated_duration_hours",
        "maintenance_date",
        "next_maintenance_date",
        "cost",
        "status",
    ]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        MaintenanceService.create_maintenance_record(serializer.instance)

    def perform_update(self, serializer):
        previous_car = serializer.instance.car
        super().perform_update(serializer)
        MaintenanceService.sync_maintenance_record(serializer.instance, self.request.user, previous_car=previous_car)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        record = self.get_object()
        MaintenanceService.complete_maintenance(record, request.user)
        return Response(self.get_serializer(record).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        record = self.get_object()
        MaintenanceService.cancel_maintenance(record, request.user)
        return Response(self.get_serializer(record).data)


class IncidentViewSet(AgencyScopedQuerysetMixin, AuditCreateUpdateMixin, viewsets.ModelViewSet):
    queryset = Incident.objects.select_related("agency", "contract", "client", "car", "created_by").all()
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "type": ["exact"],
        "contract": ["exact"],
        "client": ["exact"],
        "car": ["exact"],
        "agency": ["exact"],
        "created_at": ["gte", "lte"],
    }
    search_fields = ["description", "contract__contract_number", "client__full_name", "car__plate_number"]
    ordering_fields = ["created_at", "updated_at", "amount", "status"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        MaintenanceService.create_incident(serializer.instance)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        incident = self.get_object()
        MaintenanceService.resolve_incident(incident, request.user)
        return Response(self.get_serializer(incident).data)
