"""
Serializers for listings app
"""
from rest_framework import serializers
from .models import (
    Hotel, HotelImage, HotelAmenity, HotelAmenityMapping,
    RoomType, RoomImage, RoomAmenity, RoomAmenityMapping, RoomAvailability,
    Favorite, BnBFavorite, BnBListing, BnBImage, BnBAvailability,
)
from apps.users.serializers import UserDetailSerializer


def _absolute_media_url(context, url):
    """SerializerMethodField images bypass DRF's ImageField, which normally
    makes URLs absolute via request context automatically -- do it by hand."""
    request = context.get('request')
    if request and isinstance(url, str) and url.startswith('/'):
        return request.build_absolute_uri(url)
    return url


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
            'longitude', 'phone', 'email', 'website',
            'check_in_time', 'check_out_time', 'maximum_nights',
            'host',
            'is_active', 'is_verified', 'is_featured',
            'created_at', 'updated_at', 'full_address', 'images',
            'amenity_mappings'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        # One hotel per host account -- a host genuinely running two
        # separate hotel businesses should sign up as two separate
        # accounts (each hotel's permit/KRA PIN is normally tied to that
        # specific business registration anyway). Application-layer only,
        # not a DB constraint, so it doesn't touch any host who already has
        # more than one hotel from before this rule existed.
        request = self.context.get('request')
        if request and not self.instance:
            if Hotel.objects.filter(host=request.user).exists():
                raise serializers.ValidationError({
                    'non_field_errors': [
                        "You already have a hotel registered on this account. "
                        "A separate hotel business should sign up as its own account."
                    ]
                })
        return attrs


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
        # obj.images.all() reuses the view's prefetch_related('images') cache;
        # obj.images.filter(...) would issue a fresh query per object instead.
        images = list(obj.images.all())
        primary_image = next((img for img in images if img.is_primary), None)
        if primary_image:
            return _absolute_media_url(self.context, primary_image.image.url)
        if images:
            return _absolute_media_url(self.context, images[0].image.url)
        return None

    def get_amenity_count(self, obj):
        """Get the number of amenities"""
        return sum(1 for mapping in obj.amenity_mappings.all() if mapping.is_available)


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
    hotel_id = serializers.IntegerField(write_only=True, required=False)
    images = RoomImageSerializer(many=True, read_only=True)
    amenity_mappings = RoomAmenityMappingSerializer(many=True, read_only=True)
    availability = RoomAvailabilitySerializer(many=True, read_only=True)
    configuration_completed = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomType
        fields = [
            'id', 'hotel', 'hotel_id', 'name', 'category', 'description',
            'short_description', 'bed_type', 'bed_count',
            'max_occupancy', 'max_adults', 'max_children', 'total_rooms',
            'base_price', 'currency', 'has_balcony', 'has_kitchen', 'has_living_room',
            'has_dining_area', 'has_workspace', 'has_bathtub', 'has_shower',
            'has_sea_view', 'has_city_view', 'has_garden_view', 'is_active',
            'is_available', 'created_at', 'updated_at', 'images',
            'amenity_mappings', 'availability', 'configuration_completed'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_configuration_completed(self, obj):
        has_images = obj.images.exists()
        has_amenities = any(mapping.is_available for mapping in obj.amenity_mappings.all())
        has_availability = obj.availability.exists()
        changed_after_create = obj.updated_at and obj.created_at and obj.updated_at > obj.created_at

        return any([
            has_images,
            has_amenities,
            has_availability,
            changed_after_create,
        ])
    
    def update(self, instance, validated_data):
        """Update room type - don't allow changing the hotel"""
        # Remove hotel_id from validated_data if present (can't change hotel on update)
        validated_data.pop('hotel_id', None)
        return super().update(instance, validated_data)


class RoomTypeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for room type listings"""
    primary_image = serializers.SerializerMethodField()
    amenity_count = serializers.SerializerMethodField()
    current_price = serializers.SerializerMethodField()
    configuration_completed = serializers.SerializerMethodField()
    images = RoomImageSerializer(many=True, read_only=True)
    amenity_mappings = RoomAmenityMappingSerializer(many=True, read_only=True)
    availability = RoomAvailabilitySerializer(many=True, read_only=True)
    
    class Meta:
        model = RoomType
        fields = [
            'id', 'name', 'category', 'short_description',
            'bed_type', 'bed_count', 'max_occupancy', 'max_adults',
            'max_children', 'total_rooms', 'base_price', 'currency', 'is_available',
            'primary_image', 'amenity_count', 'current_price',
            'has_balcony', 'has_kitchen', 'has_living_room', 'has_dining_area',
            'has_workspace', 'has_bathtub', 'has_shower', 'has_sea_view',
            'has_city_view', 'has_garden_view', 'created_at', 'updated_at',
            'images', 'amenity_mappings', 'availability', 'configuration_completed'
        ]
    
    def get_primary_image(self, obj):
        """Get the primary image URL"""
        # obj.images.all() reuses the view's prefetch_related('images') cache;
        # obj.images.filter(...) would issue a fresh query per object instead.
        images = list(obj.images.all())
        primary_image = next((img for img in images if img.is_primary), None)
        if primary_image:
            return _absolute_media_url(self.context, primary_image.image.url)
        if images:
            return _absolute_media_url(self.context, images[0].image.url)
        return None

    def get_amenity_count(self, obj):
        """Get the number of amenities"""
        return sum(1 for mapping in obj.amenity_mappings.all() if mapping.is_available)
    
    def get_current_price(self, obj):
        """Get current price (could be overridden for specific dates)"""
        return obj.base_price

    def get_configuration_completed(self, obj):
        has_images = obj.images.exists()
        has_amenities = any(mapping.is_available for mapping in obj.amenity_mappings.all())
        has_availability = obj.availability.exists()
        changed_after_create = obj.updated_at and obj.created_at and obj.updated_at > obj.created_at

        return any([
            has_images,
            has_amenities,
            has_availability,
            changed_after_create,
        ])


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

    def validate_hotel_id(self, value):
        if not Hotel.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError('Hotel not found.')
        return value


# --- BnB Image Serializer ---
class BnBImageSerializer(serializers.ModelSerializer):
    """Serializer for BnB listing images"""
    
    class Meta:
        model = BnBImage
        fields = [
            'id', 'image', 'image_type', 'caption', 'is_primary', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        image_url = data.get('image')
        request = self.context.get('request')
        if request and isinstance(image_url, str) and image_url.startswith('/'):
            data['image'] = request.build_absolute_uri(image_url)
        return data


# --- BnB Listing Serializer ---
class BnBListingSerializer(serializers.ModelSerializer):
    host = serializers.IntegerField(source='host_id', read_only=True)
    images = BnBImageSerializer(many=True, read_only=True)
    full_address = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = BnBListing
        fields = [
            'id', 'host', 'title', 'description', 'property_type',
            'address', 'city', 'state_province', 'country', 'postal_code',
            'latitude', 'longitude', 'full_address',
            'price_per_night', 'cleaning_fee', 'security_deposit', 'currency',
            'bedrooms', 'bathrooms', 'beds', 'max_guests',
            'square_footage', 'year_built',
            'check_in_time', 'check_out_time', 'minimum_nights', 'maximum_nights',
            'amenities', 'house_rules',
            'smoking_allowed', 'pets_allowed', 'parties_allowed', 'children_allowed',
            'highlights', 'nearby_attractions', 'transportation', 'special_instructions',
            'host_name', 'host_phone', 'host_email', 'emergency_contact',
            'number_of_units',
            'is_company_operated', 'owner_id_number', 'owner_kra_pin', 'owner_permit',
            'company_name', 'company_kra_pin', 'company_contact_phone', 'company_contact_email',
            'company_permit',
            'is_active', 'is_verified', 'is_featured',
            'images', 'primary_image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'host', 'created_at', 'updated_at', 'full_address', 'primary_image']
        # Government ID numbers, tax PINs, and scanned permit documents are
        # submitted once by the host for platform compliance/verification --
        # this endpoint's GET is public (IsAuthenticatedOrReadOnly), so these
        # must never be echoed back to any viewer, including the owning host.
        extra_kwargs = {
            'owner_id_number': {'write_only': True},
            'owner_kra_pin': {'write_only': True},
            'owner_permit': {'write_only': True},
            'company_kra_pin': {'write_only': True},
            'company_permit': {'write_only': True},
        }

    def get_primary_image(self, obj):
        """Get the primary image URL"""
        # obj.images.all() reuses the view's prefetch_related('images') cache;
        # obj.images.filter(...) would issue a fresh query per object instead.
        images = list(obj.images.all())
        primary_image = next((img for img in images if img.is_primary), None)
        if primary_image:
            return _absolute_media_url(self.context, primary_image.image.url)
        if images:
            return _absolute_media_url(self.context, images[0].image.url)
        return None

    def update(self, instance, validated_data):
        # owner_id_number/owner_kra_pin/company_kra_pin are write_only, so
        # the edit form (which re-sends the *entire* form on every save)
        # can never pre-populate them and will submit them blank unless the
        # host retypes them on every unrelated edit. Blank on update means
        # "unchanged", not "clear this" -- only a real create actually
        # requires these; only overwrite when a non-blank value is sent.
        for field in ('owner_id_number', 'owner_kra_pin', 'company_kra_pin'):
            if field in validated_data and not validated_data[field]:
                validated_data.pop(field)
        return super().update(instance, validated_data)


class BnBListingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for BnB listing lists"""
    host = serializers.IntegerField(source='host_id', read_only=True)
    primary_image = serializers.SerializerMethodField()
    full_address = serializers.ReadOnlyField()

    class Meta:
        model = BnBListing
        fields = [
            'id', 'host', 'title', 'description', 'property_type',
            'city', 'country', 'full_address', 'price_per_night',
            'bedrooms', 'bathrooms', 'max_guests',
            'is_active', 'is_verified', 'is_featured',
            'primary_image', 'created_at'
        ]
        read_only_fields = ['id', 'host', 'created_at', 'full_address', 'primary_image']

    def get_primary_image(self, obj):
        """Get the primary image URL"""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image:
            return _absolute_media_url(self.context, primary_image.image.url)
        first_image = obj.images.first()
        if first_image:
            return _absolute_media_url(self.context, first_image.image.url)
        return None


class BnBFavoriteSerializer(serializers.ModelSerializer):
    """Serializer for user BnB favorites"""
    bnb_listing = BnBListingListSerializer(read_only=True)
    bnb_listing_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = BnBFavorite
        fields = ['id', 'bnb_listing', 'bnb_listing_id', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        bnb_listing_id = validated_data['bnb_listing_id']
        favorite, _ = BnBFavorite.objects.get_or_create(user=user, bnb_listing_id=bnb_listing_id)
        return favorite

    def validate_bnb_listing_id(self, value):
        if not BnBListing.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError('BnB listing not found.')
        return value


class BnBAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for BnB availability calendar"""
    
    class Meta:
        model = BnBAvailability
        fields = [
            'id', 'date', 'status', 'price_override', 'min_stay', 'max_stay',
            'walk_in_guest_name', 'walk_in_paid',
            'is_available', 'current_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_available', 'current_price', 'created_at', 'updated_at']
