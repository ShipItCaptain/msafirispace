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

    class HostApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Host Confirmation'
        APPROVED = 'approved', 'Approved'
        DECLINED = 'declined', 'Declined'

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

    # Pricing snapshot (copied from room/listing at time of booking, so a
    # later price change on the listing doesn't retroactively change what a
    # guest was already quoted/charged)
    nightly_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    total_nights = models.PositiveIntegerField()
    # One-time fee (BnBListing.cleaning_fee at booking time); 0 for hotel
    # bookings, which have no equivalent fee today.
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    # Refundable security deposit (BnBListing.security_deposit at booking
    # time) -- shown to the guest, not folded into total_amount since it
    # isn't a charge.
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Status
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.PAY_AT_PREMISES)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    # Tracks whether the host has confirmed real-world room/listing availability
    # for a pending request. Decoupled from `status` because the host's
    # yes/no decision happens before payment, and `status` only becomes
    # CONFIRMED once payment is settled (online or pay-at-premises).
    host_approval_status = models.CharField(
        max_length=20,
        choices=HostApprovalStatus.choices,
        default=HostApprovalStatus.PENDING,
    )

    # True if real day-level availability data (RoomAvailability/
    # BnBAvailability rows) existed for every night of this stay at booking
    # time -- i.e. the host runs a live calendar we could check instantly,
    # vs. us having to ask the host directly with no data to go on.
    calendar_verified = models.BooleanField(default=True)
    # Soft inventory hold while this request is host_approval_status=PENDING.
    # A short window (settings.BOOKING_HOLD_MINUTES) when calendar_verified,
    # a longer one (settings.BOOKING_HOST_RESPONSE_SLA_HOURS) when it isn't
    # and the host has to be asked directly. Past this timestamp, a pending
    # booking no longer blocks other guests from booking the same dates --
    # checked lazily wherever availability is computed, not by a background
    # job (no scheduler is running yet; see BOOKING_HOLD_MINUTES comment in
    # settings.py for the upgrade path). Cleared once the host approves.
    hold_expires_at = models.DateTimeField(null=True, blank=True)

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
            models.Index(fields=['host_approval_status']),
            models.Index(fields=['created_at'])
        ]

    def clean(self):
        """Validate that either hotel+room_type OR bnb_listing is provided"""
        # `_has_booking_items` is a transient (non-persisted) flag set by
        # MultiRoomBookingSerializer before save(): a multi-room-type booking
        # has no single `room_type` of its own, its rooms live in BookingItem
        # rows created right after this Booking gets a pk.
        has_hotel_booking = self.hotel is not None and (
            self.room_type is not None or getattr(self, '_has_booking_items', False)
        )
        has_bnb_booking = self.bnb_listing is not None
        
        if not (has_hotel_booking or has_bnb_booking):
            raise ValidationError(
                "Either hotel+room_type (for hotel bookings) or bnb_listing (for BnB bookings) must be provided."
            )
        
        if has_hotel_booking and has_bnb_booking:
            raise ValidationError(
                "Cannot have both hotel and BnB booking. Please specify either hotel+room_type OR bnb_listing."
            )
        
        if has_hotel_booking and self.room_type is not None and self.room_type.hotel != self.hotel:
            raise ValidationError(
                "Room type must belong to the specified hotel."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_hold_expired(self):
        from django.utils import timezone
        return (
            self.host_approval_status == self.HostApprovalStatus.PENDING
            and self.hold_expires_at is not None
            and self.hold_expires_at < timezone.now()
        )

    def __str__(self):
        booking_type = "Hotel" if self.hotel else "BnB"
        return f"Booking #{self.id} - {booking_type} - {self.traveler_id} - {self.check_in} to {self.check_out}"


class BookingItem(models.Model):
    """
    One room-type line within a multi-room-type booking (e.g. 2x Standard +
    1x Family in a single reservation). `Booking.room_type` stays null for
    bookings that use items instead of the single legacy room_type field.
    """
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='items')
    room_type = models.ForeignKey('listings.RoomType', on_delete=models.PROTECT, related_name='booking_items')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], default=1)
    nightly_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity}x {self.room_type.name} for Booking #{self.booking_id}"
