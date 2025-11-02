"""
Admin configuration for the Users app
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProfile, UserAddress


class UserProfileInline(admin.StackedInline):
    """
    Inline admin for UserProfile
    """
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Extended Profile'
    fields = [
        'travel_style', 'preferred_accommodation_type', 'dietary_restrictions',
        'accessibility_needs', 'host_rating', 'total_reviews', 'response_time',
        'acceptance_rate', 'website', 'facebook', 'instagram', 'twitter',
        'linkedin', 'languages_spoken', 'certifications', 'awards'
    ]


class UserAddressInline(admin.TabularInline):
    """
    Inline admin for UserAddress
    """
    model = UserAddress
    extra = 1
    fields = [
        'address_type', 'street_address', 'street_address2', 'city',
        'state_province', 'postal_code', 'country', 'is_default', 'is_active'
    ]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User admin interface
    """
    list_display = [
        'email', 'username', 'get_full_name', 'user_type', 'is_verified',
        'is_premium', 'is_active', 'date_joined', 'last_login'
    ]
    list_filter = [
        'user_type', 'is_verified', 'is_premium', 'is_active', 'is_staff',
        'is_superuser', 'date_joined', 'last_login'
    ]
    search_fields = ['email', 'username', 'first_name', 'last_name', 'company_name']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender')
        }),
        ('Profile', {
            'fields': ('profile_picture', 'bio', 'location', 'city', 'country')
        }),
        ('Account Type', {
            'fields': ('user_type', 'is_verified', 'is_premium')
        }),
        ('Business Information', {
            'fields': ('company_name', 'business_license', 'tax_id'),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('preferred_language', 'preferred_currency', 'notification_preferences'),
            'classes': ('collapse',)
        }),
        ('Referral System', {
            'fields': ('referral_code', 'referred_by'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
        ('Verification', {
            'fields': ('email_verified', 'email_verification_token', 'password_reset_token', 'password_reset_expires'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'user_type'),
        }),
    )
    
    inlines = [UserProfileInline, UserAddressInline]
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('extended_profile')
    
    actions = ['verify_users', 'make_premium', 'make_regular']
    
    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} users have been verified.')
    verify_users.short_description = "Verify selected users"
    
    def make_premium(self, request, queryset):
        updated = queryset.update(is_premium=True)
        self.message_user(request, f'{updated} users have been upgraded to premium.')
    make_premium.short_description = "Upgrade selected users to premium"
    
    def make_regular(self, request, queryset):
        updated = queryset.update(is_premium=False)
        self.message_user(request, f'{updated} users have been downgraded to regular.')
    make_regular.short_description = "Downgrade selected users to regular"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Admin interface for UserProfile
    """
    list_display = ['user', 'travel_style', 'host_rating', 'total_reviews', 'response_time']
    list_filter = ['travel_style', 'host_rating', 'total_reviews']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['host_rating', 'total_reviews']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Travel Preferences', {
            'fields': ('travel_style', 'preferred_accommodation_type', 'dietary_restrictions', 'accessibility_needs')
        }),
        ('Host Information', {
            'fields': ('host_rating', 'total_reviews', 'response_time', 'acceptance_rate')
        }),
        ('Social Media', {
            'fields': ('website', 'facebook', 'instagram', 'twitter', 'linkedin'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('languages_spoken', 'certifications', 'awards'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    """
    Admin interface for UserAddress
    """
    list_display = ['user', 'address_type', 'city', 'country', 'is_default', 'is_active']
    list_filter = ['address_type', 'country', 'is_default', 'is_active']
    search_fields = ['user__email', 'street_address', 'city', 'country']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Address Information', {
            'fields': ('address_type', 'street_address', 'street_address2', 'city', 'state_province', 'postal_code', 'country')
        }),
        ('Status', {
            'fields': ('is_default', 'is_active')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
