"""
Custom User model for Msafiri Space
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser
    Supports both travelers and hosts with role-based permissions
    """
    
    class UserType(models.TextChoices):
        TRAVELER = 'traveler', _('Traveler')
        HOST = 'host', _('Host')
        ADMIN = 'admin', _('Administrator')
    
    class HostType(models.TextChoices):
        BNB_HOST = 'bnb_host', _('BnB Host')
        HOTEL_RESTAURANT_HOST = 'hotel_restaurant_host', _('Hotel/Restaurant Host')
    
    class Role(models.TextChoices):
        GUEST = 'guest', _('Guest')
        BNB_HOST = 'bnb_host', _('BnB Host')
        HOTEL_HOST = 'hotel_host', _('Hotel Accommodation Host')
    
    class Gender(models.TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHER = 'other', _('Other')
        PREFER_NOT_TO_SAY = 'prefer_not_to_say', _('Prefer not to say')
    
    # Basic Information
    email = models.EmailField(_('email address'), unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=Gender.choices, blank=True, null=True)
    
    # Profile Information
    profile_picture = models.ImageField(
        upload_to='users/profile_pictures/',
        blank=True,
        null=True
    )
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # User Type and Permissions
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.TRAVELER
    )
    # Multi-role support
    roles = models.JSONField(default=list, help_text="List of roles the user holds")
    active_role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.GUEST,
        help_text="Current active role context"
    )
    host_type = models.CharField(
        max_length=30,
        choices=HostType.choices,
        blank=True,
        null=True,
        help_text="Specific type of host (only for hosts)"
    )
    is_verified = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    
    # Host-specific verification status
    host_verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        default='pending',
        help_text="Verification status for hosts"
    )
    
    # Host-specific fields
    company_name = models.CharField(max_length=200, blank=True)
    business_license = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=100, blank=True)
    
    # Preferences
    preferred_language = models.CharField(max_length=10, default='en')
    preferred_currency = models.CharField(max_length=3, default='KES')
    notification_preferences = models.JSONField(default=dict)
    
    # Social and Referral
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(blank=True, null=True)
    
    # Email verification
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    
    # Password reset
    password_reset_token = models.CharField(max_length=100, blank=True, null=True)
    password_reset_expires = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['user_type']),
            models.Index(fields=['referral_code']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def save(self, *args, **kwargs):
        # Generate referral code if not exists
        if not self.referral_code:
            import secrets
            import string
            alphabet = string.ascii_uppercase + string.digits
            self.referral_code = ''.join(secrets.choice(alphabet) for _ in range(8))
        # Ensure roles at least contains guest
        if not self.roles:
            self.roles = [self.Role.GUEST]
        if self.Role.GUEST not in self.roles:
            self.roles.append(self.Role.GUEST)
        # Ensure active_role is valid
        if not self.active_role:
            self.active_role = self.Role.GUEST
        if self.active_role not in dict(self.Role.choices):
            self.active_role = self.Role.GUEST
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate host type is set when user is a host"""
        from django.core.exceptions import ValidationError
        # Only validate if we're creating a new user or explicitly updating
        # Skip validation during authentication/login
        if hasattr(self, '_state') and self._state.adding:
            if self.user_type == self.UserType.HOST and not self.host_type:
                raise ValidationError("Host type must be specified for host users")
    
    @property
    def is_host(self):
        return self.user_type == self.UserType.HOST
    
    @property
    def is_traveler(self):
        return self.user_type == self.UserType.TRAVELER
    
    @property
    def is_admin(self):
        return self.user_type == self.UserType.ADMIN
    
    @property
    def is_bnb_host(self):
        return (self.user_type == self.UserType.HOST and self.host_type == self.HostType.BNB_HOST) or (self.Role.BNB_HOST in (self.roles or []))
    
    @property
    def is_hotel_restaurant_host(self):
        return self.user_type == self.UserType.HOST and self.host_type == self.HostType.HOTEL_RESTAURANT_HOST

    @property
    def is_hotel_host(self):
        return self.Role.HOTEL_HOST in (self.roles or [])

    # Role management helpers
    def has_role(self, role: str) -> bool:
        try:
            return role in (self.roles or [])
        except Exception:
            return False

    def add_role(self, role: str) -> None:
        if role not in dict(self.Role.choices):
            return
        roles = list(self.roles or [])
        if role not in roles:
            roles.append(role)
            self.roles = roles

    def remove_role(self, role: str) -> None:
        roles = list(self.roles or [])
        if role in roles and role != self.Role.GUEST:
            roles.remove(role)
            self.roles = roles
            # If active_role removed, fallback to guest
            if self.active_role == role:
                self.active_role = self.Role.GUEST

    def switch_active_role(self, role: str) -> bool:
        """
        Switch the active role for the user.
        Allows switching to 'guest' even if not explicitly in roles array (safety fallback).
        For other roles, the role must be in the user's roles array.
        """
        # Validate role is a valid choice
        if role not in dict(self.Role.choices):
            return False
        
        # Always allow switching to 'guest' (safety fallback)
        # Ensure 'guest' is in roles array
        if role == self.Role.GUEST:
            if self.Role.GUEST not in (self.roles or []):
                if not self.roles:
                    self.roles = [self.Role.GUEST]
                else:
                    self.roles.append(self.Role.GUEST)
            self.active_role = role
            return True
        
        # For other roles, they must be in the user's roles array
        if role in (self.roles or []):
            self.active_role = role
            return True
        
        return False
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    def get_display_name(self):
        """Return the best available name for display."""
        if self.get_full_name().strip():
            return self.get_full_name()
        elif self.company_name:
            return self.company_name
        else:
            return self.email


class UserProfile(models.Model):
    """
    Extended profile information for users
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='extended_profile')
    
    # Travel Preferences (for travelers)
    travel_style = models.CharField(max_length=50, blank=True)  # budget, luxury, adventure, etc.
    preferred_accommodation_type = models.CharField(max_length=50, blank=True)
    dietary_restrictions = models.JSONField(default=list)
    accessibility_needs = models.JSONField(default=list)
    
    # Host-specific information
    host_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    response_time = models.DurationField(blank=True, null=True)
    acceptance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Social media links
    website = models.URLField(blank=True)
    facebook = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    
    # Additional information
    languages_spoken = models.JSONField(default=list)
    certifications = models.JSONField(default=list)
    awards = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Profile for {self.user.email}"


class UserAddress(models.Model):
    """
    User address information
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    
    address_type = models.CharField(max_length=20, choices=[
        ('home', 'Home'),
        ('work', 'Work'),
        ('billing', 'Billing'),
        ('shipping', 'Shipping'),
    ])
    
    street_address = models.CharField(max_length=255)
    street_address2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_addresses'
        verbose_name_plural = 'User addresses'
    
    def __str__(self):
        return f"{self.user.email} - {self.address_type} address"
    
    def save(self, *args, **kwargs):
        # Ensure only one default address per type per user
        if self.is_default:
            UserAddress.objects.filter(
                user=self.user,
                address_type=self.address_type,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class BnBHostProfile(models.Model):
    """
    Extended profile for BnB hosts
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='bnb_profile')
    
    # Property management
    property_count = models.PositiveIntegerField(default=0)
    max_properties = models.PositiveIntegerField(default=5)
    
    # BnB-specific fields
    home_sharing_license = models.CharField(max_length=100, blank=True)
    insurance_document = models.FileField(
        upload_to='hosts/insurance/',
        blank=True,
        null=True
    )
    property_management_style = models.CharField(
        max_length=50,
        choices=[
            ('self_managed', 'Self-Managed'),
            ('property_manager', 'Property Manager'),
            ('hybrid', 'Hybrid'),
        ],
        default='self_managed'
    )
    
    # Guest interaction preferences
    guest_interaction_level = models.CharField(
        max_length=50,
        choices=[
            ('minimal', 'Minimal'),
            ('moderate', 'Moderate'),
            ('high', 'High'),
        ],
        default='moderate'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bnb_host_profiles'
        verbose_name = 'BnB Host Profile'
        verbose_name_plural = 'BnB Host Profiles'
    
    def __str__(self):
        return f"BnB Profile for {self.user.email}"


class HotelRestaurantHostProfile(models.Model):
    """
    Extended profile for Hotel/Restaurant hosts
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='hotel_restaurant_profile')
    
    # Establishment details
    establishment_type = models.CharField(
        max_length=50,
        choices=[
            ('hotel', 'Hotel Only'),
            ('restaurant', 'Restaurant Only'),
            ('both', 'Hotel & Restaurant'),
        ]
    )
    establishment_count = models.PositiveIntegerField(default=1)
    
    # Licenses and certifications
    tourism_license = models.CharField(max_length=100, blank=True)
    health_certificate = models.FileField(
        upload_to='hosts/health_certs/',
        blank=True,
        null=True
    )
    food_handling_certificate = models.FileField(
        upload_to='hosts/food_certs/',
        blank=True,
        null=True
    )
    
    # Business details
    star_rating = models.PositiveIntegerField(
        choices=[(i, f'{i} Star') for i in range(1, 6)],
        blank=True,
        null=True
    )
    cuisine_types = models.JSONField(default=list)
    room_count = models.PositiveIntegerField(default=0)
    table_count = models.PositiveIntegerField(default=0)
    
    # Management
    management_style = models.CharField(
        max_length=50,
        choices=[
            ('owner_managed', 'Owner-Managed'),
            ('professional_manager', 'Professional Manager'),
            ('franchise', 'Franchise'),
        ],
        default='owner_managed'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'hotel_restaurant_host_profiles'
        verbose_name = 'Hotel/Restaurant Host Profile'
        verbose_name_plural = 'Hotel/Restaurant Host Profiles'
    
    def __str__(self):
        return f"Hotel/Restaurant Profile for {self.user.email}"
