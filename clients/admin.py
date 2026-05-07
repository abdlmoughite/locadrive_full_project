from django.contrib import admin

from clients.models import Client, ClientBlacklistLog, ClientDocument, ClientHistoryEvent, ClientNote


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "agency", "phone", "status", "blacklisted", "total_spent", "total_debt")
    search_fields = ("full_name", "phone", "email", "cin", "passport", "driving_license")
    list_filter = ("agency", "status", "blacklisted", "created_at")


@admin.register(ClientDocument)
class ClientDocumentAdmin(admin.ModelAdmin):
    list_display = ("client", "type", "agency", "created_at")
    search_fields = ("client__full_name", "type")
    list_filter = ("agency", "type")


@admin.register(ClientNote)
class ClientNoteAdmin(admin.ModelAdmin):
    list_display = ("client", "agency", "created_by", "created_at")
    search_fields = ("client__full_name", "note")
    list_filter = ("agency", "created_at")


@admin.register(ClientBlacklistLog)
class ClientBlacklistLogAdmin(admin.ModelAdmin):
    list_display = ("client", "agency", "action", "reason", "created_by", "created_at")
    search_fields = ("client__full_name", "reason", "note")
    list_filter = ("agency", "action", "created_at")


@admin.register(ClientHistoryEvent)
class ClientHistoryEventAdmin(admin.ModelAdmin):
    list_display = ("client", "agency", "event_type", "title", "created_by", "created_at")
    search_fields = ("client__full_name", "title", "description")
    list_filter = ("agency", "event_type", "created_at")
