from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Message(models.Model):
    """
    A single message in the thread attached to a booking. The thread has
    exactly two participants: the booking's traveler and the host of the
    hotel/BnB listing being booked -- there's no group chat here, so
    membership is derived from the booking itself rather than stored.
    """

    booking = models.ForeignKey(
        'bookings.Booking', on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['booking', 'created_at']),
        ]

    def __str__(self):
        return f"Message #{self.id} on booking #{self.booking_id} from {self.sender_id}"
