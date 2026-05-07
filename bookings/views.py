from bookings.models import Contract, Reservation
from bookings.serializers import (
    ContractCompleteSerializer,
    ContractCreateSerializer,
    ContractDepositSerializer,
    ContractSerializer,
    ContractUpdateSerializer,
    ReservationConvertSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
)
from bookings.services import BookingService
from common.mixins import AgencyScopedQuerysetMixin
from common.permissions import IsAuthenticatedAndVerified
from common.pdf import build_contract_pdf_response
from finance.serializers import DepositSerializer
from finance.services import FinanceService
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class ReservationViewSet(AgencyScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("agency", "client", "car", "created_by").all()
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "car": ["exact"],
        "client": ["exact"],
        "agency": ["exact"],
        "start_date": ["gte", "lte"],
        "end_date": ["gte", "lte"],
    }
    search_fields = ["client__full_name", "car__plate_number", "car__brand", "car__model"]
    ordering_fields = ["created_at", "updated_at", "start_date", "end_date", "status", "estimated_total"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        agency = request.user.agency
        if request.user.role == "SUPERADMIN":
            agency = validated.get("agency")
            if agency is None:
                return Response({"agency": ["Agency is required."]}, status=status.HTTP_400_BAD_REQUEST)
        reservation = BookingService.create_reservation(
            agency=agency,
            client=validated.get("client"),
            car=validated["car"],
            start_date=validated["start_date"],
            end_date=validated["end_date"],
            advance_amount=validated.get("advance_amount", 0),
            created_by=request.user,
            new_client_data=validated.get("new_client"),
        )
        return Response(ReservationSerializer(reservation, context=self.get_serializer_context()).data, status=201)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        reservation = self.get_object()
        BookingService.confirm_reservation(reservation, request.user)
        return Response(ReservationSerializer(reservation, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        BookingService.cancel_reservation(reservation, request.user)
        return Response(ReservationSerializer(reservation, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="convert-to-contract")
    def convert_to_contract(self, request, pk=None):
        reservation = self.get_object()
        serializer = ReservationConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contract = BookingService.convert_reservation_to_contract(reservation, request.user, **serializer.validated_data)
        return Response(ContractSerializer(contract, context=self.get_serializer_context()).data, status=201)


class ContractViewSet(AgencyScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Contract.objects.select_related("agency", "client", "car", "reservation", "created_by").all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "car": ["exact"],
        "client": ["exact"],
        "agency": ["exact"],
        "start_date": ["gte", "lte"],
        "expected_return_date": ["gte", "lte"],
    }
    search_fields = ["contract_number"]
    ordering_fields = ["created_at", "updated_at", "start_date", "expected_return_date", "status", "total_amount"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return ContractCreateSerializer
        if self.action in {"update", "partial_update"}:
            return ContractUpdateSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        agency = request.user.agency
        if request.user.role == "SUPERADMIN":
            agency = validated.get("agency")
            if agency is None:
                return Response({"agency": ["Agency is required."]}, status=status.HTTP_400_BAD_REQUEST)
        contract = BookingService.create_contract(
            agency=agency,
            client=validated["client"],
            car=validated["car"],
            start_date=validated["start_date"],
            expected_return_date=validated["expected_return_date"],
            daily_price=validated.get("daily_price", validated["car"].daily_price),
            start_mileage=validated["start_mileage"],
            start_fuel_level=validated["start_fuel_level"],
            created_by=request.user,
            discount_amount=validated.get("discount_amount", 0),
            extra_fees=validated.get("extra_fees", 0),
            blacklist_override_reason=validated.get("blacklist_override_reason", ""),
            activate_now=validated.get("activate_now", False),
        )
        return Response(ContractSerializer(contract, context=self.get_serializer_context()).data, status=201)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        contract = self.get_object()
        BookingService.activate_contract(contract, request.user)
        return Response(ContractSerializer(contract, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        contract = self.get_object()
        serializer = ContractCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        BookingService.complete_contract(contract, request.user, **serializer.validated_data)
        return Response(ContractSerializer(contract, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        contract = self.get_object()
        BookingService.cancel_contract(contract, request.user)
        return Response(ContractSerializer(contract, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["get"], url_path="financial-summary")
    def financial_summary(self, request, pk=None):
        contract = self.get_object()
        return Response(BookingService.get_financial_summary(contract))

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        contract = self.get_object()
        return build_contract_pdf_response(contract)

    @action(detail=True, methods=["post"], url_path="deposit")
    def deposit(self, request, pk=None):
        contract = self.get_object()
        serializer = ContractDepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deposit = FinanceService.create_deposit(
            contract=contract,
            amount=serializer.validated_data["amount"],
            payment_method=serializer.validated_data["payment_method"],
            created_by=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response(DepositSerializer(deposit, context=self.get_serializer_context()).data, status=201)
