from rest_framework.permissions import BasePermission


SUPERADMIN = "SUPERADMIN"
AGENCY_OWNER = "AGENCY_OWNER"
AGENCY_AGENT = "AGENCY_AGENT"
ACTIVE = "ACTIVE"


def _is_active_user(user):
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "is_active", False)
        and getattr(user, "status", None) == ACTIVE
    )


def _is_verified_user(user):
    if getattr(user, "role", None) != AGENCY_OWNER:
        return True
    return getattr(user, "is_verified", True)


class IsAuthenticatedAndActive(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return _is_active_user(user)


class IsAuthenticatedAndVerified(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return _is_active_user(user) and _is_verified_user(user)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(_is_active_user(request.user) and getattr(request.user, "role", None) == SUPERADMIN)


class IsAgencyOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(
            _is_active_user(request.user)
            and getattr(request.user, "role", None) == AGENCY_OWNER
            and _is_verified_user(request.user)
        )


class IsAgencyStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            _is_active_user(request.user)
            and getattr(request.user, "role", None) in {AGENCY_OWNER, AGENCY_AGENT}
            and getattr(request.user, "agency_id", None) is not None
            and _is_verified_user(request.user)
        )


class IsSameAgency(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "role", None) == SUPERADMIN:
            return True
        user_agency_id = getattr(user, "agency_id", None)
        if user_agency_id is None:
            return False
        object_agency_id = getattr(obj, "agency_id", None)
        if object_agency_id is None and hasattr(obj, "agency"):
            object_agency_id = getattr(obj.agency, "id", None)
        return object_agency_id == user_agency_id


class IsOwnerOrSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            _is_active_user(request.user)
            and getattr(request.user, "role", None) in {AGENCY_OWNER, SUPERADMIN}
            and _is_verified_user(request.user)
        )


class CanManageFinance(BasePermission):
    def has_permission(self, request, view):
        return bool(
            _is_active_user(request.user)
            and getattr(request.user, "role", None) in {AGENCY_OWNER, SUPERADMIN}
            and _is_verified_user(request.user)
        )


class CanOverrideBlacklist(BasePermission):
    def has_permission(self, request, view):
        return bool(
            _is_active_user(request.user)
            and getattr(request.user, "role", None) in {AGENCY_OWNER, SUPERADMIN}
            and _is_verified_user(request.user)
        )
