from django.db import models


class AgencyScopedQuerysetMixin:
    agency_filter_field = "agency"

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return queryset.none()
        if getattr(user, "role", None) == "SUPERADMIN":
            return queryset
        agency_filter_field = getattr(self, "agency_filter_field", None)
        if not agency_filter_field:
            return queryset
        return queryset.filter(**{agency_filter_field: user.agency})


class AuditCreateUpdateMixin:
    def _model_has_field(self, serializer, field_name: str) -> bool:
        model = serializer.Meta.model
        return any(field.name == field_name for field in model._meta.get_fields() if isinstance(field, models.Field))

    def perform_create(self, serializer):
        user = self.request.user
        save_kwargs = {}

        if self._model_has_field(serializer, "agency") and getattr(user, "role", None) != "SUPERADMIN":
            save_kwargs["agency"] = user.agency

        if self._model_has_field(serializer, "created_by"):
            save_kwargs["created_by"] = user

        if self._model_has_field(serializer, "updated_by"):
            save_kwargs["updated_by"] = user

        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        save_kwargs = {}
        if self._model_has_field(serializer, "updated_by"):
            save_kwargs["updated_by"] = user
        serializer.save(**save_kwargs)
