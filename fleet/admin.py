from django.contrib import admin

from fleet.models import Car, CarDocument, CarHistoryEvent


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ("brand", "model", "plate_number", "agency", "status", "daily_price", "mileage")
    search_fields = ("brand", "model", "plate_number")
    list_filter = ("agency", "status", "fuel_type", "transmission", "year")


@admin.register(CarDocument)
class CarDocumentAdmin(admin.ModelAdmin):
    list_display = ("car", "type", "agency", "expiry_date", "created_at")
    search_fields = ("car__plate_number", "type")
    list_filter = ("agency", "type", "expiry_date")


@admin.register(CarHistoryEvent)
class CarHistoryEventAdmin(admin.ModelAdmin):
    list_display = ("car", "event_type", "title", "created_by", "created_at")
    search_fields = ("car__plate_number", "title", "description")
    list_filter = ("agency", "event_type", "created_at")
