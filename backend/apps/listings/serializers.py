"""
Serializers for listings app
"""
from rest_framework import serializers
from .models import (
    Hotel, HotelImage, HotelAmenity, HotelAmenityMapping,
    RoomType, RoomImage, RoomAmenity, RoomAmenityMapping, RoomAvailability,
    Favorite, BnBListing,
)
from apps.users.serializers import UserDetailSerializer


class HotelAmenitySerializer(serializers.ModelSerializer):
    """Serializer for hotel amenities"""
    
    class Meta:
        model = HotelAmenity
        fields = ['id', 'name', 'category', 'icon', 'description', 'is_active']


class HotelImageSerializer(serializers.ModelSerializer):
    """Serializer for hotel images"""
    
    class Meta:
        model = HotelImage
        fields = [
            'id', 'image', 'image_type', 'caption', 'is_primary', 'order'
        ]


class HotelAmenityMappingSerializer(serializers.ModelSerializer):
    """Serializer for hotel amenity mappings"""
    amenity = HotelAmenitySerializer(read_only=True)
    amenity_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = HotelAmenityMapping
        fields = [
            'id', 'amenity', 'amenity_id', 'is_available', 'additional_info'
        ]


class HotelSerializer(serializers.ModelSerializer):
    """Serializer for hotels"""
    host = UserDetailSerializer(read_only=True)
    images = HotelImageSerializer(many=True, read_only=True)
    amenity_mappings = HotelAmenityMappingSerializer(many=True, read_only=True)
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'description', 'short_description',
            'property_type', 'star_rating', 'address', 'city',
            'state_province', 'country', 'postal_code', 'latitude',
            'longitude', 'phone', 'email', 'website', 'host',
            'is_active', 'is_verified', 'is_featured',
            'created_at', 'updated_at', 'full_address', 'images',
            'amenity_mappings'
        ]
        read_only_fields = ['created_at', 'updated_at']


class HotelListSerializer(serializers.ModelSerializer):
    """Simplified serializer for hotel listings"""
    host = serializers.IntegerField(source='host_id', read_only=True)
    primary_image = serializers.SerializerMethodField()
    amenity_count = serializers.SerializerMethodField()
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = Hotel
        fields = [
            'id', 'name', 'short_description', 'property_type', 'host',
            'star_rating', 'city', 'country', 'is_verified',
            'is_featured', 'full_address', 'primary_image',
            'amenity_count'
        ]
    
    def get_primary_image(self, obj):
        """Get the primary image URL"""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            return primary_image.image.url
        # Fallback to first image if no primary image
        first_image = obj.images.first()
        if first_image:
            return first_image.image.url
        return None
    
    def get_amenity_count(self, obj):
        """Get the number of amenities"""
        return obj.amenity_mappings.filter(is_available=True).count()


class HotelDetailSerializer(HotelSerializer):
    """Detailed serializer for hotel detail view"""
    # This inherits all fields from HotelSerializer
    # Can add additional computed fields here if needed
    pass


# Room Serializers
class RoomAmenitySerializer(serializers.ModelSerializer):
    """Serializer for room amenities"""
    
    class Meta:
        model = RoomAmenity
        fields = ['id', 'name', 'category', 'icon', 'description', 'is_active']


class RoomImageSerializer(serializers.ModelSerializer):
    """Serializer for room images"""
    
    class Meta:
        model = RoomImage
        fields = [
            'id', 'image', 'image_type', 'caption', 'is_primary', 'order'
        ]


class RoomAmenityMappingSerializer(serializers.ModelSerializer):
    """Serializer for room amenity mappings"""
    amenity = RoomAmenitySerializer(read_only=True)
    amenity_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = RoomAmenityMapping
        fields = [
            'id', 'amenity', 'amenity_id', 'is_available', 'additional_info'
        ]


class RoomAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for room availability"""
    
    class Meta:
        model = RoomAvailability
        fields = [
            'id', 'date', 'status', 'available_rooms', 'total_rooms',
            'price_override', 'min_stay', 'max_stay', 'is_available', 'current_price'
        ]
        read_only_fields = ['is_available', 'current_price']


class RoomTypeSerializer(serializers.ModelSerializer):
    """Serializer for room types"""
    hotel = serializers.PrimaryKeyRelatedField(read_only=True)
    hotel_id = serializers.IntegerField(write_only=True)
    images = RoomImageSerializer(many=True, read_only=True)
    amenity_mappings = RoomAmenityMappingSerializer(many=True, read_only=True)
    availability = RoomAvailabilitySerializer(many=True, read_only=True)
    
    class Meta:
        model = RoomType
        fields = [
            'id', 'hotel', 'hotel_id', 'name', 'category', 'description',
            'short_description', 'bed_type', 'bed_count',
            'max_occupancy', 'max_adults', 'max_children', 'base_price',
            'currency', 'has_balcony', 'has_kitchen', 'has_living_room',
            'has_dining_area', 'has_workspace', 'has_bathtub', 'has_shower',
            'has_sea_view', 'has_city_view', 'has_garden_view', 'is_active',
            'is_available', 'created_at', 'updated_at', 'images',
            'amenity_mappings', 'availability'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    # Remove custom create method - let default behavior handle hotel_id


class RoomTypeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for room type listings"""
    primary_image = serializers.SerializerMethodField()
    amenity_count = serializers.SerializerMethodField()
    current_price = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomType
        fields = [
            'id', 'name', 'category', 'short_description',
            'bed_type', 'bed_count', 'max_occupancy', 'max_adults',
            'max_children', 'base_price', 'currency', 'is_available',
            'primary_image', 'amenity_count', 'current_price'
        ]
    
    def get_primary_image(self, obj):
        """Get the primary image URL"""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            return primary_image.image.url
        # Fallback to first image if no primary image
        first_image = obj.images.first()
        if first_image:
            return first_image.image.url
        return None
    
    def get_amenity_count(self, obj):
        """Get the number of amenities"""
        return obj.amenity_mappings.filter(is_available=True).count()
    
    def get_current_price(self, obj):
        """Get current price (could be overridden for specific dates)"""
        return obj.base_price


class RoomTypeDetailSerializer(RoomTypeSerializer):
    """Detailed serializer for room type detail view"""
    # This inherits all fields from RoomTypeSerializer
    # Can add additional computed fields here if needed
    pass


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for user favorites"""
    hotel = HotelListSerializer(read_only=True)
    hotel_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'hotel', 'hotel_id', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        hotel_id = validated_data['hotel_id']
        favorite, _ = Favorite.objects.get_or_create(user=user, hotel_id=hotel_id)
        return favorite


# --- New: BnB Listing Serializer ---
class BnBListingSerializer(serializers.ModelSerializer):
    host = serializers.IntegerField(source='host_id', read_only=True)

    class Meta:
        model = BnBListing
        fields = [
            'id', 'host', 'title', 'description', 'property_type',
            'address', 'city', 'country', 'price_per_night',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'host', 'created_at', 'updated_at']
