from django.urls import include, path
from rest_framework.routers import DefaultRouter

from finance.views import DepositViewSet, ExpenseViewSet, InvoiceViewSet, PaymentViewSet


router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")
router.register("deposits", DepositViewSet, basename="deposit")
router.register("expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("", include(router.urls)),
]
