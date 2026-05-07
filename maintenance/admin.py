from django.contrib import admin

from maintenance.models import Incident, Maintenance


@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ("car", "agency", "type", "cost", "maintenance_date", "next_maintenance_date", "status")
    search_fields = ("type", "description", "car__plate_number")
    list_filter = ("agency", "status", "maintenance_date", "next_maintenance_date")


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ("type", "agency", "client", "car", "contract", "amount", "status", "created_at")
    search_fields = ("description", "client__full_name", "car__plate_number", "contract__contract_number")
    list_filter = ("agency", "type", "status", "created_at")
