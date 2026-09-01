"""
Serializers for promotions app
"""
from rest_framework import serializers
from .models import Promotion, PromotionSlot
from apps.listings.serializers import HotelListSerializer
from apps.users.serializers import UserDetailSerializer


class PromotionSerializer(serializers.ModelSerializer):
    provider = UserDetailSerializer(read_only=True)
    hotel = HotelListSerializer(read_only=True)
    hotel_id = serializers.IntegerField(write_only=True)
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Promotion
        fields = [
            'id', 'provider', 'hotel', 'hotel_id', 'promotion_type', 'title',
            'description', 'image', 'original_price', 'discounted_price',
            'discount_percentage', 'currency', 'start_date', 'end_date',
            'is_recurring', 'status', 'views_count', 'clicks_count',
            'bookings_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'provider', 'views_count', 'clicks_count', 'bookings_count',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        validated_data['provider'] = self.context['request'].user
        return super().create(validated_data)


class PromotionListSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    hotel_city = serializers.CharField(source='hotel.city', read_only=True)
    hotel_image = serializers.SerializerMethodField()
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Promotion
        fields = [
            'id', 'hotel', 'hotel_name', 'hotel_city', 'hotel_image', 'promotion_type',
            'title', 'description', 'original_price', 'discounted_price', 'discount_percentage',
            'currency', 'start_date', 'end_date', 'status', 'is_active', 'views_count', 'clicks_count'
        ]

    def get_hotel_image(self, obj):
        primary_image = obj.hotel.images.filter(is_primary=True).first()
        if primary_image:
            return primary_image.image.url
        first_image = obj.hotel.images.first()
        if first_image:
            return first_image.image.url
        return None


class PromotionSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromotionSlot
        fields = [
            'id', 'promotion_type', 'slot_type', 'base_price', 'peak_multiplier',
            'currency', 'start_hour', 'end_hour', 'peak_start_hour', 'peak_end_hour',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
