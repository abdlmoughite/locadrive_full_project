from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/", include("agencies.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("fleet.urls")),
    path("api/", include("clients.urls")),
    path("api/", include("bookings.urls")),
    path("api/", include("finance.urls")),
    path("api/", include("maintenance.urls")),
    path("api/", include("reports.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
