from .models import AdminActionLog


def log_admin_action(request, action, target, changes=None, note=''):
    """
    Write one row to the admin audit trail. Call explicitly at the end of
    every mutating admin view/action -- see AdminActionLog's docstring for
    why this isn't a signal.
    """
    AdminActionLog.objects.create(
        actor=request.user,
        actor_tier=request.user.admin_tier or '',
        action=action,
        target_model=f'{target._meta.app_label}.{target._meta.object_name}',
        target_id=str(target.pk),
        changes=changes or {},
        note=note,
        ip_address=request.META.get('REMOTE_ADDR'),
    )
