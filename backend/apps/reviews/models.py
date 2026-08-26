from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Review(models.Model):
    """
    Reviews for hotels, room types, and BnB listings by travelers after completed stays.
    """

    traveler = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    # Hotel booking review fields (nullable for BnB reviews)
    hotel = models.ForeignKey('listings.Hotel', on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    room_type = models.ForeignKey('listings.RoomType', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    # BnB booking review field (nullable for hotel reviews)
    bnb_listing = models.ForeignKey('listings.BnBListing', on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    host_reply = models.TextField(blank=True)
    host_reply_updated_at = models.DateTimeField(null=True, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hotel']),
            models.Index(fields=['bnb_listing']),
            models.Index(fields=['traveler']),
        ]

    def clean(self):
        """Validate that either hotel or bnb_listing is provided"""
        from django.core.exceptions import ValidationError
        if not self.hotel and not self.bnb_listing:
            raise ValidationError("Either hotel or bnb_listing must be provided.")
        if self.hotel and self.bnb_listing:
            raise ValidationError("Cannot specify both hotel and bnb_listing.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.hotel:
            return f"Hotel {self.hotel_id} - {self.rating}★"
        elif self.bnb_listing:
            return f"BnB {self.bnb_listing_id} - {self.rating}★"
        return f"Review {self.id} - {self.rating}★"
