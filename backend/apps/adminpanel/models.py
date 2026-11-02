from django.conf import settings
from django.db import models


class AdminActionLog(models.Model):
    """
    Write-once audit trail for every mutating action taken through the super
    admin dashboard. Written explicitly by views via adminpanel.audit.log_admin_action
    rather than via a signal -- several admin actions (status transitions) aren't
    plain field saves, and an explicit call per view is easier to verify in review
    than a post_save fan-out across five apps' models.
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='admin_actions',
    )
    # Snapshot, not a live lookup -- actor's tier can change after this row is written.
    actor_tier = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=100, help_text='e.g. "listing.verify", "booking.status_change"')
    target_model = models.CharField(max_length=100, help_text='e.g. "listings.BnBListing"')
    target_id = models.CharField(max_length=50)
    changes = models.JSONField(default=dict, blank=True, help_text='{"before": {...}, "after": {...}} where relevant')
    note = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_action_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_model', 'target_id']),
            models.Index(fields=['actor', 'created_at']),
        ]

    def __str__(self):
        return f'{self.action} on {self.target_model}#{self.target_id} by {self.actor_id}'
