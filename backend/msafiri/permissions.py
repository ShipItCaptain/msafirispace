from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission: only the object's owner may access it.

    Every detail view in this project already scopes its get_queryset() to
    request.user, which is the real access control -- this is a second,
    explicit backstop so a future get_queryset() that forgets to filter
    doesn't silently expose other users' records. Views set `owner_field` to
    the attribute name holding the owning user (defaults to 'user').
    """

    def has_object_permission(self, request, view, obj):
        owner_field = getattr(view, 'owner_field', 'user')
        return getattr(obj, owner_field, None) == request.user
