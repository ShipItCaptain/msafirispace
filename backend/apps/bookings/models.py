from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator


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
    # We reference RoomType via app label to avoid circular imports
    room_type = models.ForeignKey(
        'listings.RoomType',
        on_delete=models.PROTECT,
        related_name='bookings'
    )
    hotel = models.ForeignKey(
        'listings.Hotel',
        on_delete=models.PROTECT,
        related_name='bookings'
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
            models.Index(fields=['status']),
            models.Index(fields=['created_at'])
        ]

    def __str__(self):
        return f"Booking #{self.id} - {self.traveler_id} - {self.check_in} to {self.check_out}"
