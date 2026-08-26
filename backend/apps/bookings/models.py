from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError


User = get_user_model()


class Booking(models.Model):
    """
    Core booking model for room reservations.
    Supports pay-online and pay-at-premises flows and basic status tracking.
    """

    class BookingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    class PaymentMethod(models.TextChoices):
        ONLINE = 'online', 'Online'
        PAY_AT_PREMISES = 'pay_at_premises', 'Pay at Premises'

    class PaymentStatus(models.TextChoices):
        PENDING = 'pending_payment', 'Pending Payment'
        UNPAID = 'unpaid', 'Unpaid'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        PAID = 'paid', 'Paid'
        REFUNDED = 'refunded', 'Refunded'

    # Relations
    traveler = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    # Hotel booking fields (nullable for BnB bookings)
    room_type = models.ForeignKey(
        'listings.RoomType',
        on_delete=models.PROTECT,
        related_name='bookings',
        null=True,
        blank=True,
        help_text="Required for hotel bookings"
    )
    hotel = models.ForeignKey(
        'listings.Hotel',
        on_delete=models.PROTECT,
        related_name='bookings',
        null=True,
        blank=True,
        help_text="Required for hotel bookings"
    )
    # BnB booking field (nullable for hotel bookings)
    bnb_listing = models.ForeignKey(
        'listings.BnBListing',
        on_delete=models.PROTECT,
        related_name='bookings',
        null=True,
        blank=True,
        help_text="Required for BnB bookings"
    )

    # Stay details
    check_in = models.DateField()
    check_out = models.DateField()
    num_adults = models.PositiveIntegerField(validators=[MinValueValidator(1)], default=1)
    num_children = models.PositiveIntegerField(default=0)
    special_requests = models.TextField(blank=True)

    # Pricing snapshot (copied from room at time of booking)
    nightly_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    total_nights = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Status
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.PAY_AT_PREMISES)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)

    # Contact snapshot
    guest_full_name = models.CharField(max_length=150)
    guest_email = models.EmailField()
    guest_phone = models.CharField(max_length=20, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['traveler']),
            models.Index(fields=['hotel']),
            models.Index(fields=['bnb_listing']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at'])
        ]

    def clean(self):
        """Validate that either hotel+room_type OR bnb_listing is provided"""
        has_hotel_booking = self.hotel is not None and self.room_type is not None
        has_bnb_booking = self.bnb_listing is not None
        
        if not (has_hotel_booking or has_bnb_booking):
            raise ValidationError(
                "Either hotel+room_type (for hotel bookings) or bnb_listing (for BnB bookings) must be provided."
            )
        
        if has_hotel_booking and has_bnb_booking:
            raise ValidationError(
                "Cannot have both hotel and BnB booking. Please specify either hotel+room_type OR bnb_listing."
            )
        
        if has_hotel_booking and self.room_type.hotel != self.hotel:
            raise ValidationError(
                "Room type must belong to the specified hotel."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        booking_type = "Hotel" if self.hotel else "BnB"
        return f"Booking #{self.id} - {booking_type} - {self.traveler_id} - {self.check_in} to {self.check_out}"
