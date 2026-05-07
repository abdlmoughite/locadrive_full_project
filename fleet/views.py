from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status

from common.mixins import AgencyScopedQuerysetMixin, AuditCreateUpdateMixin
from common.permissions import IsAuthenticatedAndVerified, IsOwnerOrSuperAdmin
from fleet.models import Car, CarDocument
from fleet.serializers import (
    CarAvailabilitySerializer,
    CarDocumentSerializer,
    CarHistoryEventSerializer,
    CarSerializer,
)
from fleet.services import FleetService


class CarViewSet(AgencyScopedQuerysetMixin, AuditCreateUpdateMixin, viewsets.ModelViewSet):
    queryset = Car.objects.select_related("agency").all()
    serializer_class = CarSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "fuel_type": ["exact"],
        "transmission": ["exact"],
        "agency": ["exact"],
        "is_active": ["exact"],
    }
    search_fields = ["brand", "model", "plate_number"]
    ordering_fields = ["created_at", "updated_at", "daily_price", "status", "year"]

    def get_permissions(self):
        if self.action in {"destroy", "deactivate", "reactivate"}:
            return [IsAuthenticatedAndVerified(), IsOwnerOrSuperAdmin()]
        return [permission() for permission in self.permission_classes]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "SUPERADMIN":
            agency = serializer.validated_data.get("agency")
            if agency is None:
                raise ValidationError({"agency": "Agency is required for superadmin car creation."})
            serializer.save(agency=agency)
            return

        if user.agency is None:
            raise ValidationError({"agency": "No agency is linked to this account. Please contact support."})
        serializer.save(agency=user.agency)

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        serializer = CarAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]

        cars = []
        for car in self.filter_queryset(self.get_queryset().filter(is_active=True)):
            if FleetService.check_car_availability(car, start_date, end_date):
                cars.append(car)
        page = self.paginate_queryset(cars)
        if page is not None:
            return self.get_paginated_response(CarSerializer(page, many=True, context=self.get_serializer_context()).data)
        return Response(CarSerializer(cars, many=True, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"], url_path="choices")
    def choices(self, request):
        return Response(
            {
                "fuel_type": [{"value": value, "label": label} for value, label in Car.FuelType.choices],
                "transmission": [{"value": value, "label": label} for value, label in Car.Transmission.choices],
                "status": [{"value": value, "label": label} for value, label in Car.Status.choices],
            }
        )

    @action(detail=True, methods=["post"], url_path="set-maintenance")
    def set_maintenance(self, request, pk=None):
        car = self.get_object()
        FleetService.set_car_status(car, Car.Status.MAINTENANCE, request.user, "Marked as maintenance from API.")
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["post"], url_path="set-available")
    def set_available(self, request, pk=None):
        car = self.get_object()
        FleetService.set_car_status(car, Car.Status.AVAILABLE, request.user, "Marked as available from API.")
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        car = self.get_object()
        FleetService.deactivate_car(car, request.user, "Car deactivated from API.")
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request, pk=None):
        car = self.get_object()
        FleetService.reactivate_car(car, request.user, "Car reactivated from API.")
        return Response(self.get_serializer(car).data)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        car = self.get_object()
        queryset = FleetService.get_car_history(car)
        page = self.paginate_queryset(queryset)
        serializer = CarHistoryEventSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        car = self.get_object()
        FleetService.deactivate_car(car, request.user, "Car deactivated via legacy delete endpoint.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class CarDocumentViewSet(AgencyScopedQuerysetMixin, AuditCreateUpdateMixin, viewsets.ModelViewSet):
    queryset = CarDocument.objects.select_related("agency", "car").all()
    serializer_class = CarDocumentSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {"car": ["exact"], "type": ["exact"], "agency": ["exact"], "expiry_date": ["gte", "lte"]}
    search_fields = ["car__brand", "car__model", "car__plate_number", "type"]
    ordering_fields = ["created_at", "expiry_date"]
