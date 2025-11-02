"""
Serializers for concierge app
"""
from rest_framework import serializers
from .models import ServiceRequest, ServiceOffer
from apps.users.serializers import UserDetailSerializer


class ServiceRequestSerializer(serializers.ModelSerializer):
    traveler = UserDetailSerializer(read_only=True)
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'traveler', 'request_type', 'title', 'description', 'location',
            'budget_min', 'budget_max', 'currency', 'preferred_start_date',
            'preferred_end_date', 'status', 'contact_phone', 'contact_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'traveler', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['traveler'] = self.context['request'].user
        return super().create(validated_data)


class ServiceRequestListSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.get_display_name', read_only=True)
    offer_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'traveler_name', 'request_type', 'title', 'location',
            'budget_min', 'budget_max', 'currency', 'status', 'offer_count',
            'created_at'
        ]

    def get_offer_count(self, obj):
        return obj.offers.count()


class ServiceOfferSerializer(serializers.ModelSerializer):
    provider = UserDetailSerializer(read_only=True)
    service_request = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = ServiceOffer
        fields = [
            'id', 'service_request', 'provider', 'title', 'description',
            'price', 'currency', 'terms_conditions', 'cancellation_policy',
            'status', 'created_at', 'updated_at', 'expires_at'
        ]
        read_only_fields = ['id', 'provider', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['provider'] = self.context['request'].user
        return super().create(validated_data)


class ServiceOfferListSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_display_name', read_only=True)
    provider_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceOffer
        fields = [
            'id', 'provider_name', 'provider_rating', 'title', 'price',
            'currency', 'status', 'created_at'
        ]

    def get_provider_rating(self, obj):
        # Get average rating from user profile
        return getattr(obj.provider.extended_profile, 'host_rating', 0.0)
