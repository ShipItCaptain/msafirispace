"""
Serializers for reviews app
"""
from django.utils import timezone
from rest_framework import serializers
from .models import Review
from apps.bookings.models import Booking
from apps.users.serializers import UserDetailSerializer
from apps.listings.serializers import HotelListSerializer, RoomTypeListSerializer, BnBListingListSerializer


class ReviewSerializer(serializers.ModelSerializer):
    traveler = UserDetailSerializer(read_only=True)
    hotel = HotelListSerializer(read_only=True)
    room_type = RoomTypeListSerializer(read_only=True)
    bnb_listing = BnBListingListSerializer(read_only=True)
    # Creation is always anchored to a specific completed booking -- this is
    # what proves the reviewer actually stayed there, rather than trusting a
    # client-supplied hotel_id/bnb_listing_id for an arbitrary listing.
    booking_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = Review
        fields = [
            'id', 'traveler', 'booking_id', 'hotel', 'room_type',
            'bnb_listing',
            'rating', 'title', 'comment', 'host_reply', 'host_reply_updated_at', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'traveler', 'host_reply_updated_at', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

    def validate_booking_id(self, value):
        request = self.context['request']
        try:
            booking = Booking.objects.get(pk=value)
        except Booking.DoesNotExist:
            raise serializers.ValidationError("Booking not found.")

        if booking.traveler_id != request.user.id:
            raise serializers.ValidationError("You can only review your own bookings.")
        if booking.status not in (Booking.BookingStatus.CONFIRMED, Booking.BookingStatus.COMPLETED):
            raise serializers.ValidationError("You can only review a booking once it's confirmed.")
        if booking.check_out > timezone.localdate():
            raise serializers.ValidationError("You can review this stay once your check-out date has passed.")
        if Review.objects.filter(booking_id=value).exists():
            raise serializers.ValidationError("You've already reviewed this stay.")

        self._booking = booking
        return value

    def create(self, validated_data):
        booking = self._booking
        validated_data.pop('booking_id', None)
        validated_data['traveler'] = self.context['request'].user
        validated_data['booking'] = booking
        validated_data['hotel'] = booking.hotel
        validated_data['bnb_listing'] = booking.bnb_listing
        validated_data['room_type'] = booking.room_type
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.get_display_name', read_only=True)
    traveler_avatar = serializers.SerializerMethodField()
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    bnb_listing_title = serializers.CharField(source='bnb_listing.title', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'traveler_name', 'traveler_avatar', 'hotel_name', 'bnb_listing_title',
            'rating', 'title', 'comment', 'host_reply', 'host_reply_updated_at', 'created_at'
        ]

    def get_traveler_avatar(self, obj):
        picture = getattr(obj.traveler, 'profile_picture', None)
        if picture and getattr(picture, 'name', ''):
            try:
                return picture.url
            except Exception:
                return None
        return None


class HotelReviewStatsSerializer(serializers.Serializer):
    total_reviews = serializers.IntegerField()
    # coerce_to_string=False so this serializes as a JSON number, not a
    # string -- frontend code calls .toFixed()/does arithmetic on this value
    # directly, which throws on a string and previously crashed the whole
    # BnB/hotel detail page the moment a listing had any reviews.
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, coerce_to_string=False)
    rating_distribution = serializers.DictField()
