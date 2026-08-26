from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Hotel(models.Model):
    """
    Hotel model for Msafiri Space marketplace
    """
    
    class PropertyType(models.TextChoices):
        HOTEL = 'hotel', 'Hotel'
        RESORT = 'resort', 'Resort'
        BOUTIQUE_HOTEL = 'boutique_hotel', 'Boutique Hotel'
        BUSINESS_HOTEL = 'business_hotel', 'Business Hotel'
        LUXURY_HOTEL = 'luxury_hotel', 'Luxury Hotel'
        BUDGET_HOTEL = 'budget_hotel', 'Budget Hotel'
        BED_AND_BREAKFAST = 'bed_and_breakfast', 'Bed & Breakfast'
        HOSTEL = 'hostel', 'Hostel'
        APARTMENT = 'apartment', 'Apartment'
        VILLA = 'villa', 'Villa'
    
    class StarRating(models.IntegerChoices):
        ONE_STAR = 1, '1 Star'
        TWO_STAR = 2, '2 Stars'
        THREE_STAR = 3, '3 Stars'
        FOUR_STAR = 4, '4 Stars'
        FIVE_STAR = 5, '5 Stars'
    
    # Basic Information
    name = models.CharField(max_length=200, help_text="Hotel name")
    description = models.TextField(help_text="Detailed hotel description")
    short_description = models.CharField(max_length=500, help_text="Brief hotel description")
    
    # Property Details
    property_type = models.CharField(
        max_length=50,
        choices=PropertyType.choices,
        default=PropertyType.HOTEL
    )
    star_rating = models.IntegerField(
        choices=StarRating.choices,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Hotel star rating (1-5)"
    )
    
    # Location Information
    address = models.TextField(help_text="Full hotel address")
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Contact Information
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Stay Rules
    check_in_time = models.TimeField(default='14:00:00')
    check_out_time = models.TimeField(default='11:00:00')
    maximum_nights = models.PositiveIntegerField(default=30)
    
    # Host Information
    host = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='hotels',
        help_text="Hotel owner/manager"
    )
    
    # Status and Verification
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Hotel'
        verbose_name_plural = 'Hotels'
    
    def __str__(self):
        return f"{self.name} - {self.city}, {self.country}"
    
    @property
    def full_address(self):
        """Return formatted full address"""
        address_parts = [self.address, self.city]
        if self.state_province:
            address_parts.append(self.state_province)
        address_parts.append(self.country)
        if self.postal_code:
            address_parts.append(self.postal_code)
        return ', '.join(address_parts)


# --- New: BnB Listing ---
class BnBListing(models.Model):
    """
    Comprehensive BnB listing model with amenities, house rules, and property details
    """
    
    class PropertyType(models.TextChoices):
        APARTMENT = 'apartment', 'Apartment'
        HOUSE = 'house', 'House'
        VILLA = 'villa', 'Villa'
        CONDO = 'condo', 'Condominium'
        STUDIO = 'studio', 'Studio'
        LOFT = 'loft', 'Loft'
        TOWNHOUSE = 'townhouse', 'Townhouse'
        CABIN = 'cabin', 'Cabin'
        OTHER = 'other', 'Other'
    
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bnb_listings')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    property_type = models.CharField(
        max_length=50,
        choices=PropertyType.choices,
        default=PropertyType.APARTMENT
    )
    
    # Location
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Kenya')
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Pricing
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='KES')
    
    # Property Details
    bedrooms = models.PositiveIntegerField(default=1)
    bathrooms = models.PositiveIntegerField(default=1)
    beds = models.PositiveIntegerField(default=1)
    max_guests = models.PositiveIntegerField(default=2)
    square_footage = models.PositiveIntegerField(null=True, blank=True)
    year_built = models.PositiveIntegerField(null=True, blank=True)
    
    # Check-in/out
    check_in_time = models.TimeField(default='15:00:00')
    check_out_time = models.TimeField(default='11:00:00')
    minimum_nights = models.PositiveIntegerField(default=1)
    maximum_nights = models.PositiveIntegerField(default=30)
    
    # Amenities (stored as JSON array)
    amenities = models.JSONField(default=list, help_text="List of amenity names")
    
    # House Rules
    house_rules = models.JSONField(default=list, help_text="List of house rules")
    smoking_allowed = models.BooleanField(default=False)
    pets_allowed = models.BooleanField(default=False)
    parties_allowed = models.BooleanField(default=False)
    children_allowed = models.BooleanField(default=True)
    
    # Additional Info
    highlights = models.JSONField(default=list, help_text="List of property highlights")
    nearby_attractions = models.TextField(blank=True)
    transportation = models.TextField(blank=True)
    special_instructions = models.TextField(blank=True)
    
    # Contact Info
    host_name = models.CharField(max_length=100, blank=True)
    host_phone = models.CharField(max_length=20, blank=True)
    host_email = models.EmailField(blank=True)
    emergency_contact = models.CharField(max_length=20, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'BnB Listing'
        verbose_name_plural = 'BnB Listings'
        indexes = [
            models.Index(fields=['city', 'country']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['price_per_night']),
        ]

    def __str__(self) -> str:
        return f"{self.title} - {self.city}, {self.country}"
    
    @property
    def full_address(self):
        """Return formatted full address"""
        parts = [self.address, self.city]
        if self.state_province:
            parts.append(self.state_province)
        parts.append(self.country)
        if self.postal_code:
            parts.append(self.postal_code)
        return ', '.join(filter(None, parts))


class BnBImage(models.Model):
    """
    BnB listing images model for photo gallery
    """
    
    class ImageType(models.TextChoices):
        EXTERIOR = 'exterior', 'Exterior'
        INTERIOR = 'interior', 'Interior'
        BEDROOM = 'bedroom', 'Bedroom'
        BATHROOM = 'bathroom', 'Bathroom'
        KITCHEN = 'kitchen', 'Kitchen'
        LIVING_AREA = 'living_area', 'Living Area'
        BALCONY = 'balcony', 'Balcony'
        GARDEN = 'garden', 'Garden'
        VIEW = 'view', 'View'
        AMENITY = 'amenity', 'Amenity'
        OTHER = 'other', 'Other'
    
    bnb_listing = models.ForeignKey(
        BnBListing,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(
        upload_to='bnb/images/',
        help_text="BnB listing image"
    )
    image_type = models.CharField(
        max_length=20,
        choices=ImageType.choices,
        default=ImageType.EXTERIOR
    )
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'BnB Image'
        verbose_name_plural = 'BnB Images'
    
    def __str__(self):
        return f"{self.bnb_listing.title} - {self.get_image_type_display()}"


class BnBAvailability(models.Model):
    """
    BnB availability model for date-based availability calendar
    """
    
    class AvailabilityStatus(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        OCCUPIED = 'occupied', 'Occupied'
        MAINTENANCE = 'maintenance', 'Maintenance'
        BLOCKED = 'blocked', 'Blocked'
        OUT_OF_ORDER = 'out_of_order', 'Out of Order'
    
    bnb_listing = models.ForeignKey(
        BnBListing,
        on_delete=models.CASCADE,
        related_name='availability'
    )
    date = models.DateField(help_text="Availability date")
    status = models.CharField(
        max_length=20,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.AVAILABLE
    )
    price_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override price for this specific date"
    )
    min_stay = models.PositiveIntegerField(default=1, help_text="Minimum stay required")
    max_stay = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum stay allowed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['bnb_listing', 'date']
        ordering = ['date']
        verbose_name = 'BnB Availability'
        verbose_name_plural = 'BnB Availability'
        indexes = [
            models.Index(fields=['bnb_listing', 'date']),
            models.Index(fields=['status', 'date']),
        ]
    
    def __str__(self):
        return f"{self.bnb_listing.title} - {self.date} ({self.status})"
    
    @property
    def is_available(self):
        return self.status == self.AvailabilityStatus.AVAILABLE
    
    @property
    def current_price(self):
        return self.price_override if self.price_override else self.bnb_listing.price_per_night


class HotelImage(models.Model):
    """
    Hotel images model for photo gallery
    """
    
    class ImageType(models.TextChoices):
        EXTERIOR = 'exterior', 'Exterior'
        LOBBY = 'lobby', 'Lobby'
        ROOM = 'room', 'Room'
        AMENITY = 'amenity', 'Amenity'
        RESTAURANT = 'restaurant', 'Restaurant'
        POOL = 'pool', 'Pool'
        SPA = 'spa', 'Spa'
        GYM = 'gym', 'Gym'
        OTHER = 'other', 'Other'
    
    hotel = models.ForeignKey(
        Hotel,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(
        upload_to='hotels/images/',
        help_text="Hotel image"
    )
    image_type = models.CharField(
        max_length=20,
        choices=ImageType.choices,
        default=ImageType.EXTERIOR
    )
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Hotel Image'
        verbose_name_plural = 'Hotel Images'
    
    def __str__(self):
        return f"{self.hotel.name} - {self.get_image_type_display()}"


class HotelAmenity(models.Model):
    """
    Hotel amenities model
    """
    
    class AmenityCategory(models.TextChoices):
        GENERAL = 'general', 'General'
        ROOM = 'room', 'Room'
        DINING = 'dining', 'Dining'
        BUSINESS = 'business', 'Business'
        RECREATION = 'recreation', 'Recreation'
        ACCESSIBILITY = 'accessibility', 'Accessibility'
        SAFETY = 'safety', 'Safety'
        TRANSPORTATION = 'transportation', 'Transportation'
    
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(
        max_length=20,
        choices=AmenityCategory.choices,
        default=AmenityCategory.GENERAL
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or name")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Hotel Amenity'
        verbose_name_plural = 'Hotel Amenities'
    
    def __str__(self):
        return self.name


class HotelAmenityMapping(models.Model):
    """
    Many-to-many relationship between hotels and amenities
    """
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='amenity_mappings')
    amenity = models.ForeignKey(HotelAmenity, on_delete=models.CASCADE)
    is_available = models.BooleanField(default=True)
    additional_info = models.TextField(blank=True, help_text="Additional information about this amenity")
    
    class Meta:
        unique_together = ['hotel', 'amenity']
        verbose_name = 'Hotel Amenity Mapping'
        verbose_name_plural = 'Hotel Amenity Mappings'
    
    def __str__(self):
        return f"{self.hotel.name} - {self.amenity.name}"


class RoomType(models.Model):
    """
    Room types model for hotels
    """
    
    class BedType(models.TextChoices):
        SINGLE = 'single', 'Single Bed'
        DOUBLE = 'double', 'Double Bed'
        QUEEN = 'queen', 'Queen Bed'
        KING = 'king', 'King Bed'
        TWIN = 'twin', 'Twin Beds'
        SOFA_BED = 'sofa_bed', 'Sofa Bed'
        BUNK_BED = 'bunk_bed', 'Bunk Beds'
        FLOOR_MATTRESS = 'floor_mattress', 'Floor Mattress'
    
    class RoomCategory(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        DELUXE = 'deluxe', 'Deluxe'
        SUITE = 'suite', 'Suite'
        PRESIDENTIAL = 'presidential', 'Presidential'
        FAMILY = 'family', 'Family'
        EXECUTIVE = 'executive', 'Executive'
        STUDIO = 'studio', 'Studio'
        PENTHOUSE = 'penthouse', 'Penthouse'
        VILLA = 'villa', 'Villa'
        APARTMENT = 'apartment', 'Apartment'
    
    # Basic Information
    hotel = models.ForeignKey(
        Hotel,
        on_delete=models.CASCADE,
        related_name='room_types'
    )
    name = models.CharField(max_length=200, help_text="Room type name (e.g., Deluxe King Room)")
    category = models.CharField(
        max_length=50,
        choices=RoomCategory.choices,
        default=RoomCategory.STANDARD
    )
    description = models.TextField(help_text="Detailed room description")
    short_description = models.CharField(max_length=500, help_text="Brief room description")
    
    # Room Specifications
    bed_type = models.CharField(
        max_length=50,
        choices=BedType.choices,
        default=BedType.DOUBLE
    )
    bed_count = models.PositiveIntegerField(default=1, help_text="Number of beds")
    max_occupancy = models.PositiveIntegerField(help_text="Maximum number of guests")
    max_adults = models.PositiveIntegerField(help_text="Maximum number of adults")
    max_children = models.PositiveIntegerField(default=0, help_text="Maximum number of children")
    
    # Pricing
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Base price per night"
    )
    currency = models.CharField(max_length=3, default='KES', help_text="Currency code")
    
    # Room Features
    has_balcony = models.BooleanField(default=False)
    has_kitchen = models.BooleanField(default=False)
    has_living_room = models.BooleanField(default=False)
    has_dining_area = models.BooleanField(default=False)
    has_workspace = models.BooleanField(default=False)
    has_bathtub = models.BooleanField(default=False)
    has_shower = models.BooleanField(default=True)
    has_sea_view = models.BooleanField(default=False)
    has_city_view = models.BooleanField(default=False)
    has_garden_view = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['hotel', 'category', 'base_price']
        verbose_name = 'Room Type'
        verbose_name_plural = 'Room Types'
    
    def __str__(self):
        return f"{self.hotel.name} - {self.name}"
    
    @property
    def room_amenities(self):
        """Get room-specific amenities"""
        return self.amenities.filter(is_available=True)


class RoomImage(models.Model):
    """
    Room images model for photo gallery
    """
    
    class ImageType(models.TextChoices):
        MAIN = 'main', 'Main Room View'
        BEDROOM = 'bedroom', 'Bedroom'
        BATHROOM = 'bathroom', 'Bathroom'
        LIVING_AREA = 'living_area', 'Living Area'
        KITCHEN = 'kitchen', 'Kitchen'
        BALCONY = 'balcony', 'Balcony'
        VIEW = 'view', 'View from Room'
        AMENITY = 'amenity', 'Room Amenity'
        OTHER = 'other', 'Other'
    
    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(
        upload_to='rooms/images/',
        help_text="Room image"
    )
    image_type = models.CharField(
        max_length=20,
        choices=ImageType.choices,
        default=ImageType.MAIN
    )
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Room Image'
        verbose_name_plural = 'Room Images'
    
    def __str__(self):
        return f"{self.room_type.name} - {self.get_image_type_display()}"


class RoomAmenity(models.Model):
    """
    Room-specific amenities model
    """
    
    class AmenityCategory(models.TextChoices):
        BEDROOM = 'bedroom', 'Bedroom'
        BATHROOM = 'bathroom', 'Bathroom'
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        COMFORT = 'comfort', 'Comfort'
        SAFETY = 'safety', 'Safety'
        CONNECTIVITY = 'connectivity', 'Connectivity'
        KITCHEN = 'kitchen', 'Kitchen'
        OUTDOOR = 'outdoor', 'Outdoor'
        OTHER = 'other', 'Other'
    
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(
        max_length=20,
        choices=AmenityCategory.choices,
        default=AmenityCategory.COMFORT
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class or name")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Room Amenity'
        verbose_name_plural = 'Room Amenities'
    
    def __str__(self):
        return self.name


class RoomAmenityMapping(models.Model):
    """
    Many-to-many relationship between room types and amenities
    """
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name='amenity_mappings')
    amenity = models.ForeignKey(RoomAmenity, on_delete=models.CASCADE)
    is_available = models.BooleanField(default=True)
    additional_info = models.TextField(blank=True, help_text="Additional information about this amenity")
    
    class Meta:
        unique_together = ['room_type', 'amenity']
        verbose_name = 'Room Amenity Mapping'
        verbose_name_plural = 'Room Amenity Mappings'
    
    def __str__(self):
        return f"{self.room_type.name} - {self.amenity.name}"


class RoomAvailability(models.Model):
    """
    Room availability model for date-based availability
    """
    
    class AvailabilityStatus(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        OCCUPIED = 'occupied', 'Occupied'
        MAINTENANCE = 'maintenance', 'Maintenance'
        BLOCKED = 'blocked', 'Blocked'
        OUT_OF_ORDER = 'out_of_order', 'Out of Order'
    
    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name='availability'
    )
    date = models.DateField(help_text="Availability date")
    status = models.CharField(
        max_length=20,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.AVAILABLE
    )
    available_rooms = models.PositiveIntegerField(default=0, help_text="Number of available rooms")
    total_rooms = models.PositiveIntegerField(default=1, help_text="Total number of rooms of this type")
    price_override = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Override price for this specific date"
    )
    min_stay = models.PositiveIntegerField(default=1, help_text="Minimum stay required")
    max_stay = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum stay allowed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['room_type', 'date']
        ordering = ['date']
        verbose_name = 'Room Availability'
        verbose_name_plural = 'Room Availability'
    
    def __str__(self):
        return f"{self.room_type.name} - {self.date} ({self.status})"
    
    @property
    def is_available(self):
        return self.status == self.AvailabilityStatus.AVAILABLE and self.available_rooms > 0
    
    @property
    def current_price(self):
        return self.price_override if self.price_override else self.room_type.base_price


# Placeholder for other listing types
class Listing(models.Model):
    """
    Generic listing model for other property types
    """
    pass


class Favorite(models.Model):
    """
    User favorites for hotels
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'hotel']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['hotel']),
        ]
        verbose_name = 'Favorite'
        verbose_name_plural = 'Favorites'

    def __str__(self):
        return f"{self.user_id} -> {self.hotel_id}"


class BnBFavorite(models.Model):
    """
    User favorites for BnB listings
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bnb_favorites')
    bnb_listing = models.ForeignKey(BnBListing, on_delete=models.CASCADE, related_name='favorited_by_users')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'bnb_listing']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['bnb_listing']),
        ]
        verbose_name = 'BnB Favorite'
        verbose_name_plural = 'BnB Favorites'

    def __str__(self):
        return f"{self.user_id} -> {self.bnb_listing_id}"
