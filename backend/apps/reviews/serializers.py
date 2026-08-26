"""
Serializers for reviews app
"""
from rest_framework import serializers
from .models import Review
from apps.users.serializers import UserDetailSerializer
from apps.listings.serializers import HotelListSerializer, RoomTypeListSerializer, BnBListingListSerializer


class ReviewSerializer(serializers.ModelSerializer):
    traveler = UserDetailSerializer(read_only=True)
    hotel = HotelListSerializer(read_only=True)
    room_type = RoomTypeListSerializer(read_only=True)
    room_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    bnb_listing = BnBListingListSerializer(read_only=True)
    bnb_listing_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Review
        fields = [
            'id', 'traveler', 'hotel', 'room_type', 'room_type_id',
            'bnb_listing', 'bnb_listing_id',
            'rating', 'title', 'comment', 'host_reply', 'host_reply_updated_at', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'traveler', 'host_reply_updated_at', 'created_at', 'updated_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

    def validate(self, attrs):
        # Get hotel_id and bnb_listing_id from initial_data or instance
        hotel_id = None
        bnb_listing_id = None
        
        if hasattr(self, 'initial_data'):
            hotel_id = self.initial_data.get('hotel_id')
            bnb_listing_id = self.initial_data.get('bnb_listing_id')
        
        if self.instance:
            if not hotel_id:
                hotel_id = self.instance.hotel_id
            if not bnb_listing_id:
                bnb_listing_id = self.instance.bnb_listing_id
        
        if not hotel_id and not bnb_listing_id:
            raise serializers.ValidationError("Either hotel_id or bnb_listing_id must be provided.")
        if hotel_id and bnb_listing_id:
            raise serializers.ValidationError("Cannot specify both hotel_id and bnb_listing_id.")
        return attrs

    def create(self, validated_data):
        validated_data['traveler'] = self.context['request'].user
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
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_distribution = serializers.DictField()
