"""
Serializers for reviews app
"""
from rest_framework import serializers
from .models import Review
from apps.users.serializers import UserDetailSerializer
from apps.listings.serializers import HotelListSerializer, RoomTypeListSerializer


class ReviewSerializer(serializers.ModelSerializer):
    traveler = UserDetailSerializer(read_only=True)
    hotel = HotelListSerializer(read_only=True)
    room_type = RoomTypeListSerializer(read_only=True)
    room_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Review
        fields = [
            'id', 'traveler', 'hotel', 'room_type', 'room_type_id',
            'rating', 'title', 'comment', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'traveler', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

    def create(self, validated_data):
        validated_data['traveler'] = self.context['request'].user
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.get_display_name', read_only=True)
    traveler_avatar = serializers.CharField(source='traveler.profile_picture.url', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'traveler_name', 'traveler_avatar', 'rating', 'title', 'comment',
            'created_at'
        ]


class HotelReviewStatsSerializer(serializers.Serializer):
    total_reviews = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_distribution = serializers.DictField()
