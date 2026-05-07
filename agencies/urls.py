from django.urls import include, path
from rest_framework.routers import DefaultRouter

from agencies.views import AgencyViewSet, SubscriptionViewSet


router = DefaultRouter()
router.register("agencies", AgencyViewSet, basename="agency")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("", include(router.urls)),
]
