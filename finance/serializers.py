from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from common.serializers import AgencyOwnedSerializerMixin
from finance.models import Deposit, Expense, Invoice, InvoiceItem, Payment
from finance.services import FinanceService


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ("id", "description", "quantity", "unit_price", "total_price")
        read_only_fields = ("id", "total_price")


class InvoiceSerializer(AgencyOwnedSerializerMixin):
    issue_date = serializers.DateField(required=False)
    due_date = serializers.DateField(required=False, allow_null=True)
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = ("invoice_number", "paid_amount", "remaining_amount", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        contract = attrs.get("contract", getattr(self.instance, "contract", None))
        client = attrs.get("client", getattr(self.instance, "client", None))
        car = attrs.get("car", getattr(self.instance, "car", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})

        for related_name in ("client", "contract", "car"):
            related_obj = attrs.get(related_name, getattr(self.instance, related_name, None))
            if related_obj and getattr(related_obj, "agency_id", None) != agency.id:
                raise serializers.ValidationError({related_name: f"{related_name.title()} must belong to the same agency."})

        if contract and not client and contract.client_id:
            attrs["client"] = contract.client
            client = contract.client
        if contract and not car and contract.car_id:
            attrs["car"] = contract.car
            car = contract.car
        if contract and client and contract.client_id != client.id:
            raise serializers.ValidationError({"client": "Invoice client must match the contract client."})
        if contract and car and contract.car_id != car.id:
            raise serializers.ValidationError({"car": "Invoice car must match the contract car."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context["request"]
        validated_data["issue_date"] = validated_data.get("issue_date") or timezone.localdate()
        validated_data["invoice_number"] = FinanceService.generate_invoice_number(
            validated_data["agency"], validated_data["issue_date"]
        )
        validated_data["created_by"] = request.user
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(agency=invoice.agency, invoice=invoice, **item_data)
        FinanceService.recalculate_invoice(invoice)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(agency=instance.agency, invoice=instance, **item_data)
        FinanceService.recalculate_invoice(instance)
        return instance


class InvoicePaySerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    reference = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    allow_overpay = serializers.BooleanField(required=False, default=False)


class PaymentSerializer(AgencyOwnedSerializerMixin):
    EXPECTED_DIRECTION_BY_TYPE = {
        Payment.Type.RENTAL_PAYMENT: Payment.Direction.INCOME,
        Payment.Type.DEPOSIT: Payment.Direction.INCOME,
        Payment.Type.DEPOSIT_REFUND: Payment.Direction.OUTCOME,
        Payment.Type.DAMAGE_PAYMENT: Payment.Direction.INCOME,
        Payment.Type.LATE_FEE_PAYMENT: Payment.Direction.INCOME,
        Payment.Type.FUEL_FEE_PAYMENT: Payment.Direction.INCOME,
        Payment.Type.EXPENSE_PAYMENT: Payment.Direction.OUTCOME,
    }

    paid_at = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(choices=Payment.Status.choices, required=False, default=Payment.Status.PAID)

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ("created_by", "created_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        client = attrs.get("client", getattr(self.instance, "client", None))
        contract = attrs.get("contract", getattr(self.instance, "contract", None))
        invoice = attrs.get("invoice", getattr(self.instance, "invoice", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})

        for related_name in ("client", "contract", "invoice"):
            related_obj = attrs.get(related_name, getattr(self.instance, related_name, None))
            if related_obj and getattr(related_obj, "agency_id", None) != agency.id:
                raise serializers.ValidationError({related_name: f"{related_name.title()} must belong to the same agency."})

        expected_direction = self.EXPECTED_DIRECTION_BY_TYPE.get(attrs.get("type", getattr(self.instance, "type", None)))
        direction = attrs.get("direction", getattr(self.instance, "direction", None))
        if expected_direction and direction and direction != expected_direction:
            raise serializers.ValidationError({"direction": "Payment direction does not match the selected payment type."})

        if invoice and not contract and invoice.contract_id:
            attrs["contract"] = invoice.contract
            contract = invoice.contract
        if invoice and not client and invoice.client_id:
            attrs["client"] = invoice.client
            client = invoice.client
        if invoice and contract and invoice.contract_id and invoice.contract_id != contract.id:
            raise serializers.ValidationError({"contract": "Payment contract must match the invoice contract."})
        if invoice and client and invoice.client_id and invoice.client_id != client.id:
            raise serializers.ValidationError({"client": "Payment client must match the invoice client."})
        if contract and client and contract.client_id != client.id:
            raise serializers.ValidationError({"client": "Payment client must match the contract client."})
        return attrs

    def create(self, validated_data):
        return FinanceService.create_payment(
            agency=validated_data["agency"],
            amount=validated_data["amount"],
            method=validated_data["method"],
            payment_type=validated_data["type"],
            direction=validated_data["direction"],
            created_by=self.context["request"].user,
            client=validated_data.get("client"),
            contract=validated_data.get("contract"),
            invoice=validated_data.get("invoice"),
            reference=validated_data.get("reference", ""),
            notes=validated_data.get("notes", ""),
            paid_at=validated_data.get("paid_at"),
            status=validated_data.get("status", Payment.Status.PAID),
        )


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = "__all__"


class DepositRefundSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True)


class DepositUseSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField()
    invoice_type = serializers.ChoiceField(choices=[
        (Invoice.Type.DAMAGE_INVOICE, "Damage invoice"),
        (Invoice.Type.LATE_FEE_INVOICE, "Late fee invoice"),
        (Invoice.Type.FUEL_FEE_INVOICE, "Fuel fee invoice"),
    ], required=False, default=Invoice.Type.DAMAGE_INVOICE)


class ExpenseSerializer(AgencyOwnedSerializerMixin):
    class Meta:
        model = Expense
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        agency = attrs.get("agency", getattr(self.instance, "agency", None))
        if user.role != "SUPERADMIN":
            attrs["agency"] = user.agency
            agency = user.agency
        elif agency is None:
            raise serializers.ValidationError({"agency": "Agency is required."})

        for related_name in ("car", "contract"):
            related_obj = attrs.get(related_name, getattr(self.instance, related_name, None))
            if related_obj and getattr(related_obj, "agency_id", None) != agency.id:
                raise serializers.ValidationError({related_name: f"{related_name.title()} must belong to the same agency."})

        if self.instance:
            if "amount" in attrs and attrs["amount"] != self.instance.amount:
                raise serializers.ValidationError({"amount": "Amount changes are not allowed after expense creation."})
            if "payment_method" in attrs and attrs["payment_method"] != self.instance.payment_method:
                raise serializers.ValidationError({"payment_method": "Payment method changes are not allowed after expense creation."})
        return attrs

    def create(self, validated_data):
        return FinanceService.create_expense(
            agency=validated_data["agency"],
            category=validated_data["category"],
            title=validated_data["title"],
            amount=validated_data["amount"],
            payment_method=validated_data["payment_method"],
            created_by=self.context["request"].user,
            description=validated_data.get("description", ""),
            supplier_name=validated_data.get("supplier_name", ""),
            expense_date=validated_data.get("expense_date"),
            car=validated_data.get("car"),
            contract=validated_data.get("contract"),
            invoice_file=validated_data.get("invoice_file"),
        )
