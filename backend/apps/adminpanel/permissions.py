"""
Admin-dashboard-specific permission classes. Kept in this app rather than
msafiri/permissions.py (which holds IsOwner, a generic project-wide
backstop) because these are only ever imported inside apps.adminpanel --
promote to the project-level module only if a second app ever needs them.
"""
from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.admin_tier == User.AdminTier.SYSTEM
        )


class IsManagerialOrSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.admin_tier in (User.AdminTier.SYSTEM, User.AdminTier.MANAGERIAL)
        )


class IsAnyAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.admin_tier
        )
