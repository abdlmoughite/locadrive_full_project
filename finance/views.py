from common.mixins import AgencyScopedQuerysetMixin
from common.pdf import build_invoice_pdf_response
from common.permissions import CanManageFinance, IsAuthenticatedAndVerified
from finance.models import Deposit, Expense, Invoice, Payment
from finance.serializers import (
    DepositRefundSerializer,
    DepositSerializer,
    DepositUseSerializer,
    ExpenseSerializer,
    InvoicePaySerializer,
    InvoiceSerializer,
    PaymentSerializer,
)
from finance.services import FinanceService
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class InvoiceViewSet(AgencyScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("agency", "client", "contract", "car", "created_by").prefetch_related("items").all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "type": ["exact"],
        "client": ["exact"],
        "contract": ["exact"],
        "agency": ["exact"],
        "issue_date": ["gte", "lte"],
        "due_date": ["gte", "lte"],
    }
    search_fields = ["invoice_number"]
    ordering_fields = ["created_at", "updated_at", "issue_date", "total_amount", "remaining_amount", "status"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action == "cancel":
            return [IsAuthenticatedAndVerified(), CanManageFinance()]
        return [permission() for permission in self.permission_classes]

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == Invoice.Status.DRAFT:
            invoice.status = Invoice.Status.ISSUED
            invoice.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoicePaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        FinanceService.pay_invoice(
            invoice=invoice,
            amount=serializer.validated_data["amount"],
            method=serializer.validated_data["method"],
            created_by=request.user,
            reference=serializer.validated_data.get("reference", ""),
            notes=serializer.validated_data.get("notes", ""),
            allow_overpay=serializer.validated_data.get("allow_overpay", False),
        )
        invoice.refresh_from_db()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == Invoice.Status.PAID:
            return Response(
                {"detail": "Paid invoices cannot be deleted or cancelled from this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoice.status = Invoice.Status.CANCELLED
        invoice.remaining_amount = 0
        invoice.save(update_fields=["status", "remaining_amount", "updated_at"])
        if invoice.client_id:
            FinanceService.update_client_financials(invoice.client)
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        return build_invoice_pdf_response(invoice)


class PaymentViewSet(AgencyScopedQuerysetMixin, mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Payment.objects.select_related("agency", "client", "contract", "invoice", "created_by").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "type": ["exact"],
        "direction": ["exact"],
        "method": ["exact"],
        "client": ["exact"],
        "contract": ["exact"],
        "invoice": ["exact"],
        "paid_at": ["gte", "lte"],
    }
    search_fields = ["invoice__invoice_number", "reference"]
    ordering_fields = ["created_at", "paid_at", "amount", "status"]


class DepositViewSet(AgencyScopedQuerysetMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Deposit.objects.select_related("agency", "client", "contract", "car", "created_by").all()
    serializer_class = DepositSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "status": ["exact"],
        "client": ["exact"],
        "contract": ["exact"],
        "car": ["exact"],
        "held_at": ["gte", "lte"],
    }
    ordering_fields = ["created_at", "updated_at", "held_at", "amount", "held_amount", "status"]

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        deposit = self.get_object()
        serializer = DepositRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        FinanceService.refund_deposit(
            deposit=deposit,
            amount=serializer.validated_data["amount"],
            created_by=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )
        deposit.refresh_from_db()
        return Response(self.get_serializer(deposit).data)

    @action(detail=True, methods=["post"])
    def use(self, request, pk=None):
        deposit = self.get_object()
        serializer = DepositUseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        FinanceService.use_deposit(
            deposit=deposit,
            amount=serializer.validated_data["amount"],
            created_by=request.user,
            reason=serializer.validated_data["reason"],
            invoice_type=serializer.validated_data.get("invoice_type", Invoice.Type.DAMAGE_INVOICE),
        )
        deposit.refresh_from_db()
        return Response(self.get_serializer(deposit).data)


class ExpenseViewSet(AgencyScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.select_related("agency", "car", "contract", "created_by").all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filterset_fields = {
        "category": ["exact"],
        "car": ["exact"],
        "contract": ["exact"],
        "agency": ["exact"],
        "expense_date": ["gte", "lte"],
    }
    search_fields = ["title", "description", "supplier_name"]
    ordering_fields = ["created_at", "updated_at", "expense_date", "amount", "category"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAuthenticatedAndVerified(), CanManageFinance()]
        return [permission() for permission in self.permission_classes]
