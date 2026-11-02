from django.contrib import admin

from .models import AdminActionLog


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'actor', 'actor_tier', 'action', 'target_model', 'target_id']
    list_filter = ['actor_tier', 'action', 'target_model']
    search_fields = ['actor__email', 'target_id', 'note']
    readonly_fields = [f.name for f in AdminActionLog._meta.fields]
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
