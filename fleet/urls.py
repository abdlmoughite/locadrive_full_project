from django.urls import include, path
from rest_framework.routers import DefaultRouter

from fleet.views import CarDocumentViewSet, CarViewSet


router = DefaultRouter()
router.register("cars", CarViewSet, basename="car")
router.register("car-documents", CarDocumentViewSet, basename="car-document")

urlpatterns = [
    path("", include(router.urls)),
]
