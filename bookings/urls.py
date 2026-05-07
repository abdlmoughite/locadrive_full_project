from django.urls import include, path
from rest_framework.routers import DefaultRouter

from bookings.views import ContractViewSet, ReservationViewSet


router = DefaultRouter()
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("contracts", ContractViewSet, basename="contract")

urlpatterns = [
    path("", include(router.urls)),
]
