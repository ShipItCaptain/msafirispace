from django.urls import reverse
from rest_framework import serializers

from apps.bookings.models import Booking
from apps.listings.models import BnBListing, Hotel
from apps.payments.models import Payment, PaymentIntent, PaymentWebhookEvent
from apps.promotions.models import Promotion
from apps.reviews.models import Review
from apps.users.models import User

from .models import AdminActionLog


class AdminLoginStep1Serializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AdminLoginStep2Serializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)


class AdminSelfSerializer(serializers.ModelSerializer):
    """What the admin UI shows for "who am I" -- deliberately trimmed, not UserDetailSerializer."""

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'admin_tier']


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """
    Broad user view for System/Managerial tiers -- includes host business
    fields (relevant to the business owner running the marketplace) but
    still not account secrets (password, verification code hash, etc).
    """

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone_number',
            'user_type', 'host_type', 'roles', 'active_role',
            'is_verified', 'is_premium', 'is_active',
            'city', 'country', 'company_name', 'business_license', 'tax_id',
            'admin_tier', 'created_at', 'last_login',
        ]


class AdminUserLookupSerializer(serializers.ModelSerializer):
    """
    Trimmed user view for Support tier -- enough to resolve a ticket (who is
    this, can they log in), nothing business/payment-adjacent.
    """

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 'user_type', 'is_active', 'created_at', 'last_login']


class AdminBookingSerializer(serializers.ModelSerializer):
    """
    Cross-cutting booking view -- not ownership-filtered like the
    traveler/host-scoped serializers in apps.bookings.serializers. Shows
    whichever of hotel/bnb_listing this booking is for as one computed
    property_name/property_type pair rather than two raw nullable FKs.
    """
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)
    property_name = serializers.SerializerMethodField()
    property_type = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'traveler_email', 'guest_full_name', 'guest_email', 'guest_phone',
            'property_type', 'property_name', 'check_in', 'check_out',
            'num_adults', 'num_children', 'total_amount', 'currency',
            'status', 'payment_status', 'host_approval_status', 'created_at',
        ]

    def get_property_name(self, obj):
        if obj.hotel_id:
            return obj.hotel.name
        if obj.bnb_listing_id:
            return obj.bnb_listing.title
        return None

    def get_property_type(self, obj):
        if obj.hotel_id:
            return 'hotel'
        if obj.bnb_listing_id:
            return 'bnb'
        return None


class AdminHotelSerializer(serializers.ModelSerializer):
    host_email = serializers.EmailField(source='host.email', read_only=True)

    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'property_type', 'star_rating', 'city', 'country',
            'host_email', 'is_active', 'is_verified', 'is_featured', 'created_at',
        ]
        read_only_fields = ['id', 'name', 'property_type', 'star_rating', 'city', 'country', 'host_email', 'created_at']


class AdminBnBListingSerializer(serializers.ModelSerializer):
    host_email = serializers.EmailField(source='host.email', read_only=True)
    owner_permit_url = serializers.SerializerMethodField()
    company_permit_url = serializers.SerializerMethodField()

    class Meta:
        model = BnBListing
        fields = [
            'id', 'title', 'property_type', 'city', 'country', 'host_email',
            'is_company_operated', 'owner_permit_url', 'company_permit_url',
            'is_active', 'is_verified', 'is_featured', 'created_at',
        ]
        read_only_fields = [
            'id', 'title', 'property_type', 'city', 'country', 'host_email',
            'is_company_operated', 'owner_permit_url', 'company_permit_url', 'created_at',
        ]

    def _document_url(self, obj, field_name):
        if not getattr(obj, field_name):
            return None
        return reverse('secure-document', kwargs={
            'app_label': 'listings', 'model_name': 'bnblisting', 'pk': obj.pk, 'field_name': field_name,
        })

    def get_owner_permit_url(self, obj):
        return self._document_url(obj, 'owner_permit')

    def get_company_permit_url(self, obj):
        return self._document_url(obj, 'company_permit')


class AdminPromotionSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    provider_email = serializers.EmailField(source='provider.email', read_only=True)

    class Meta:
        model = Promotion
        fields = [
            'id', 'title', 'promotion_type', 'status', 'hotel_name', 'provider_email',
            'original_price', 'discounted_price', 'discount_percentage', 'currency',
            'start_date', 'end_date', 'views_count', 'clicks_count', 'bookings_count', 'created_at',
        ]
        read_only_fields = [f for f in fields if f != 'status']


class AdminReviewSerializer(serializers.ModelSerializer):
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)
    property_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'traveler_email', 'property_name', 'rating', 'title', 'comment', 'is_public', 'created_at']
        read_only_fields = [f for f in fields if f != 'is_public']

    def get_property_name(self, obj):
        if obj.hotel_id:
            return obj.hotel.name
        if obj.bnb_listing_id:
            return obj.bnb_listing.title
        return None


class AdminPaymentSerializer(serializers.ModelSerializer):
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'gateway', 'amount', 'currency', 'status', 'reference',
            'provider_reference', 'description', 'booking_id', 'traveler_email', 'created_at',
        ]


class AdminPaymentIntentSerializer(serializers.ModelSerializer):
    traveler_email = serializers.EmailField(source='traveler.email', read_only=True)

    class Meta:
        model = PaymentIntent
        # paystack_authorization_url/client_secret deliberately excluded --
        # those are live auth tokens for completing a payment, not status
        # visibility, and have no business being readable from an admin list.
        fields = ['id', 'gateway', 'amount', 'currency', 'status', 'reference', 'mpesa_phone', 'booking_id', 'traveler_email', 'created_at']


class AdminPaymentWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentWebhookEvent
        fields = ['id', 'provider', 'event_key', 'request_id', 'payload', 'processed', 'processing_notes', 'created_at']


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True, default=None)

    class Meta:
        model = AdminActionLog
        fields = ['id', 'actor_email', 'actor_tier', 'action', 'target_model', 'target_id', 'changes', 'note', 'created_at']
