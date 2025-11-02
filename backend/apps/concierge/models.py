from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ServiceRequest(models.Model):
    """
    Guest service requests that providers can respond to with offers
    """
    
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    class RequestType(models.TextChoices):
        ACCOMMODATION = 'accommodation', 'Accommodation'
        TOUR = 'tour', 'Tour'
        CONCIERGE = 'concierge', 'Concierge Service'
        TRANSPORT = 'transport', 'Transport'
        OTHER = 'other', 'Other'

    # Relations
    traveler = models.ForeignKey(User, on_delete=models.CASCADE, related_name='service_requests')
    
    # Request details
    request_type = models.CharField(max_length=20, choices=RequestType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200)
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='KES')
    
    # Dates
    preferred_start_date = models.DateField(null=True, blank=True)
    preferred_end_date = models.DateField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    
    # Contact
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['traveler']),
            models.Index(fields=['request_type']),
            models.Index(fields=['status']),
            models.Index(fields=['location']),
        ]

    def __str__(self):
        return f"Service Request: {self.title} - {self.get_status_display()}"


class ServiceOffer(models.Model):
    """
    Provider offers in response to service requests
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        EXPIRED = 'expired', 'Expired'

    # Relations
    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='offers')
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='service_offers')
    
    # Offer details
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='KES')
    
    # Terms
    terms_conditions = models.TextField(blank=True)
    cancellation_policy = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['service_request']),
            models.Index(fields=['provider']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Offer: {self.title} - {self.get_status_display()}"