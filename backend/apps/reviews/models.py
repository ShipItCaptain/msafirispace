from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Review(models.Model):
    """
    Reviews for hotels and room types by travelers after completed stays.
    """

    traveler = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    hotel = models.ForeignKey('listings.Hotel', on_delete=models.CASCADE, related_name='reviews')
    room_type = models.ForeignKey('listings.RoomType', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hotel']),
            models.Index(fields=['traveler']),
        ]

    def __str__(self):
        return f"{self.hotel_id} - {self.rating}★"
