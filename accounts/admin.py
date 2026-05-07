from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "full_name", "role", "status", "is_verified", "agency", "is_staff", "date_joined")
    search_fields = ("email", "full_name")
    list_filter = ("role", "status", "is_verified", "agency", "is_staff")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "agency")}),
        (
            "Permissions",
            {"fields": ("role", "status", "is_verified", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "agency", "role", "status", "is_verified", "password1", "password2"),
            },
        ),
    )
    readonly_fields = ("date_joined", "created_at", "updated_at", "last_login")
