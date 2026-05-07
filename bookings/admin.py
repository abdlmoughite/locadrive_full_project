from django.contrib import admin

from bookings.models import Contract, Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "agency", "client", "car", "start_date", "end_date", "status", "estimated_total")
    search_fields = ("client__full_name", "car__plate_number", "car__brand", "car__model")
    list_filter = ("agency", "status", "start_date", "end_date")


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = (
        "contract_number",
        "agency",
        "client",
        "car",
        "start_date",
        "expected_return_date",
        "status",
        "total_amount",
        "remaining_amount",
    )
    search_fields = ("contract_number", "client__full_name", "car__plate_number")
    list_filter = ("agency", "status", "start_date", "expected_return_date")
