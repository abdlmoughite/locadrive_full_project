from django.urls import include, path
from rest_framework.routers import DefaultRouter

from maintenance.views import IncidentViewSet, MaintenanceViewSet


router = DefaultRouter()
router.register("maintenance", MaintenanceViewSet, basename="maintenance")
router.register("incidents", IncidentViewSet, basename="incident")

urlpatterns = [
    path("", include(router.urls)),
]
