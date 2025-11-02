"""
Serializers for bookings app
"""
from rest_framework import serializers

from .models import Booking
from apps.listings.serializers import RoomTypeListSerializer
from apps.listings.models import RoomType


class BookingSerializer(serializers.ModelSerializer):
    traveler = serializers.PrimaryKeyRelatedField(read_only=True)
    hotel = serializers.PrimaryKeyRelatedField(read_only=True)
    room_type_id = serializers.IntegerField(write_only=True)
    room_type = RoomTypeListSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'traveler', 'hotel', 'room_type', 'room_type_id',
            'check_in', 'check_out', 'num_adults', 'num_children',
            'special_requests', 'nightly_price', 'currency', 'total_nights',
            'total_amount', 'deposit_amount', 'status', 'payment_method',
            'payment_status', 'guest_full_name', 'guest_email', 'guest_phone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'traveler', 'hotel', 'nightly_price', 'currency', 'total_nights',
            'total_amount', 'status', 'payment_status', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        room_type_id = validated_data.pop('room_type_id')
        room_type = RoomType.objects.get(pk=room_type_id)
        validated_data['room_type'] = room_type
        validated_data['hotel'] = room_type.hotel
        return super().create(validated_data)


class BookingListSerializer(serializers.ModelSerializer):
    room_type = RoomTypeListSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'check_in', 'check_out', 'total_nights', 'total_amount',
            'currency', 'status', 'payment_status', 'room_type', 'created_at'
        ]


class BookingDetailSerializer(BookingSerializer):
    pass


