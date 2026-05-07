from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from clients.models import Client, ClientNote
from clients.serializers import (
    ClientActionSerializer,
    ClientDuplicateCheckSerializer,
    ClientHistoryEventSerializer,
    ClientNoteSerializer,
    ClientSerializer,
)
from clients.services import ClientService
from common.mixins import AgencyScopedQuerysetMixin, AuditCreateUpdateMixin
from common.permissions import CanOverrideBlacklist, IsAuthenticatedAndVerified
from rest_framework.generics import get_object_or_404


class ClientViewSet(AgencyScopedQuerysetMixin, AuditCreateUpdateMixin, viewsets.ModelViewSet):
    queryset = Client.objects.select_related("agency", "blacklisted_by").all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "blacklisted": ["exact"],
        "agency": ["exact"],
        "created_at": ["gte", "lte"],
    }
    search_fields = ["full_name", "phone", "cin", "driving_license", "passport"]
    ordering_fields = ["created_at", "updated_at", "full_name", "status", "total_spent", "total_debt"]

    def get_permissions(self):
        if self.action in {"destroy", "unblacklist"}:
            return [IsAuthenticatedAndVerified(), CanOverrideBlacklist()]
        return [permission() for permission in self.permission_classes]

    @action(detail=False, methods=["get"], url_path="check")
    def check(self, request):
        serializer = ClientDuplicateCheckSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        agency = request.user.agency if request.user.role != "SUPERADMIN" else None
        if request.user.role == "SUPERADMIN":
            agency_id = request.query_params.get("agency")
            if not agency_id:
                raise serializers.ValidationError({"agency": "Agency is required for superadmin duplicate checks."})
            from agencies.models import Agency

            agency = get_object_or_404(Agency, pk=agency_id)
        result = ClientService.check_duplicate_client(agency=agency, **serializer.validated_data)
        return Response(result)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        client = self.get_object()
        queryset = client.history_events.select_related("created_by").order_by("-created_at")
        page = self.paginate_queryset(queryset)
        serializer = ClientHistoryEventSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="contracts")
    def contracts(self, request, pk=None):
        client = self.get_object()
        from bookings.serializers import ContractSerializer

        queryset = client.contracts.filter(agency=client.agency).select_related("car", "reservation").order_by("-created_at")
        page = self.paginate_queryset(queryset)
        serializer = ContractSerializer(page or queryset, many=True, context=self.get_serializer_context())
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="payments")
    def payments(self, request, pk=None):
        client = self.get_object()
        from finance.serializers import PaymentSerializer

        queryset = client.payments.filter(agency=client.agency).select_related("invoice", "contract").order_by("-paid_at")
        page = self.paginate_queryset(queryset)
        serializer = PaymentSerializer(page or queryset, many=True, context=self.get_serializer_context())
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="invoices")
    def invoices(self, request, pk=None):
        client = self.get_object()
        from finance.serializers import InvoiceSerializer

        queryset = client.invoices.filter(agency=client.agency).prefetch_related("items").order_by("-issue_date")
        page = self.paginate_queryset(queryset)
        serializer = InvoiceSerializer(page or queryset, many=True, context=self.get_serializer_context())
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="deposits")
    def deposits(self, request, pk=None):
        client = self.get_object()
        from finance.serializers import DepositSerializer

        queryset = client.deposits.filter(agency=client.agency).select_related("contract", "car").order_by("-held_at")
        page = self.paginate_queryset(queryset)
        serializer = DepositSerializer(page or queryset, many=True, context=self.get_serializer_context())
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="incidents")
    def incidents(self, request, pk=None):
        client = self.get_object()
        from maintenance.serializers import IncidentSerializer

        queryset = client.incidents.filter(agency=client.agency).select_related("contract", "car").order_by("-created_at")
        page = self.paginate_queryset(queryset)
        serializer = IncidentSerializer(page or queryset, many=True, context=self.get_serializer_context())
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="notes")
    def notes(self, request, pk=None):
        client = self.get_object()
        serializer = ClientNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = ClientNote.objects.create(
            agency=client.agency,
            client=client,
            note=serializer.validated_data["note"],
            created_by=request.user,
        )
        return Response(ClientNoteSerializer(note).data, status=201)

    @action(detail=True, methods=["post"], url_path="warning")
    def warning(self, request, pk=None):
        client = self.get_object()
        serializer = ClientActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ClientService.add_warning(
            client=client,
            reason=serializer.validated_data.get("reason", ""),
            note=serializer.validated_data.get("note", ""),
            actor=request.user,
        )
        return Response(self.get_serializer(client).data)

    @action(detail=True, methods=["post"], url_path="blacklist")
    def blacklist(self, request, pk=None):
        client = self.get_object()
        serializer = ClientActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ClientService.blacklist_client(
            client=client,
            reason=serializer.validated_data.get("reason", ""),
            note=serializer.validated_data.get("note", ""),
            actor=request.user,
        )
        return Response(self.get_serializer(client).data)

    @action(detail=True, methods=["post"], url_path="unblacklist")
    def unblacklist(self, request, pk=None):
        client = self.get_object()
        serializer = ClientActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ClientService.unblacklist_client(
            client=client,
            reason=serializer.validated_data.get("reason", ""),
            note=serializer.validated_data.get("note", ""),
            actor=request.user,
        )
        return Response(self.get_serializer(client).data)
