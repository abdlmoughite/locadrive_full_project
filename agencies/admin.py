from django.contrib import admin

from agencies.models import Agency, Subscription


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "subscription_status", "created_at")
    search_fields = ("name", "email", "phone")
    list_filter = ("subscription_status", "created_at")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("agency", "plan_name", "price", "start_date", "end_date", "status")
    search_fields = ("agency__name", "plan_name")
    list_filter = ("status", "start_date", "end_date")
