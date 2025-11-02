from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Promotion(models.Model):
    """
    Promotional content for Trending Now, Last Minute Deals, and Local Favorites
    """
    
    class PromotionType(models.TextChoices):
        TRENDING = 'trending', 'Trending Now'
        LAST_MINUTE = 'last_minute', 'Last Minute Deals'
        LOCAL_FAVORITES = 'local_favorites', 'Local Favorites'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        EXPIRED = 'expired', 'Expired'

    # Relations
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='promotions')
    hotel = models.ForeignKey('listings.Hotel', on_delete=models.CASCADE, related_name='promotions')
    
    # Promotion details
    promotion_type = models.CharField(max_length=20, choices=PromotionType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='promotions/images/', blank=True)
    
    # Pricing
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percentage = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    currency = models.CharField(max_length=3, default='KES')
    
    # Scheduling
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_recurring = models.BooleanField(default=False)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # Performance tracking
    views_count = models.PositiveIntegerField(default=0)
    clicks_count = models.PositiveIntegerField(default=0)
    bookings_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['promotion_type']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['provider']),
        ]

    def __str__(self):
        return f"{self.get_promotion_type_display()}: {self.title}"

    @property
    def is_active(self):
        from django.utils import timezone
        now = timezone.now()
        return (
            self.status == self.Status.ACTIVE and
            self.start_date <= now <= self.end_date
        )


class PromotionSlot(models.Model):
    """
    Time-based slots for promotional content (hourly/daily rates)
    """
    
    class SlotType(models.TextChoices):
        HOURLY = 'hourly', 'Hourly'
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'

    promotion_type = models.CharField(max_length=20, choices=Promotion.PromotionType.choices)
    slot_type = models.CharField(max_length=20, choices=SlotType.choices)
    
    # Pricing
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    peak_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.5)
    currency = models.CharField(max_length=3, default='KES')
    
    # Time slots
    start_hour = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(23)])
    end_hour = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(23)])
    
    # Peak hours (when multiplier applies)
    peak_start_hour = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(23)],
        default=18
    )
    peak_end_hour = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(23)],
        default=22
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['promotion_type', 'slot_type', 'start_hour']
        unique_together = ['promotion_type', 'slot_type', 'start_hour', 'end_hour']

    def __str__(self):
        return f"{self.get_promotion_type_display()} - {self.get_slot_type_display()} ({self.start_hour}:00-{self.end_hour}:00)"

    def get_price_for_time(self, hour):
        """Get price for a specific hour, applying peak multiplier if applicable"""
        if self.peak_start_hour <= hour <= self.peak_end_hour:
            return self.base_price * self.peak_multiplier
        return self.base_price
