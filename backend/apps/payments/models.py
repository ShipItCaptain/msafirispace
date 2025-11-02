from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Payment(models.Model):
    """
    Records finalized payments or deposits for a booking.
    """

    class Gateway(models.TextChoices):
        MPESA = 'mpesa', 'M-Pesa'
        PAYSTACK = 'paystack', 'Paystack'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    # Relations
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='payments')
    traveler = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payments')

    # Payment info
    gateway = models.CharField(max_length=20, choices=Gateway.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reference = models.CharField(max_length=100, unique=True)
    provider_reference = models.CharField(max_length=150, blank=True)
    description = models.CharField(max_length=255, blank=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking']),
            models.Index(fields=['traveler']),
            models.Index(fields=['gateway']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Payment {self.reference} - {self.status}"


class PaymentIntent(models.Model):
    """
    A lightweight intent object for initializing a payment with the selected gateway.
    Useful for returning client secrets/shortcodes/authorization URLs.
    """

    class Gateway(models.TextChoices):
        MPESA = 'mpesa', 'M-Pesa'
        PAYSTACK = 'paystack', 'Paystack'

    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'
        AUTHORIZING = 'authorizing', 'Authorizing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        EXPIRED = 'expired', 'Expired'

    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='payment_intents')
    traveler = models.ForeignKey(User, on_delete=models.PROTECT, related_name='payment_intents')
    gateway = models.CharField(max_length=20, choices=Gateway.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')

    # Gateway specific fields
    mpesa_phone = models.CharField(max_length=20, blank=True)
    paystack_authorization_url = models.URLField(blank=True)
    client_secret = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    reference = models.CharField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PaymentIntent {self.reference} ({self.gateway}) - {self.status}"
