"""
Views for listings app
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from .models import (
    Hotel, HotelAmenity, HotelAmenityMapping, HotelImage, RoomType, RoomAmenity,
    RoomAvailability, RoomImage, Favorite, BnBFavorite, BnBListing, BnBImage,
    BnBAvailability
)
from .serializers import (
    HotelSerializer, HotelListSerializer, HotelDetailSerializer,
    HotelAmenitySerializer, HotelImageSerializer, HotelAmenityMappingSerializer,
    RoomTypeSerializer, RoomTypeListSerializer,
    RoomTypeDetailSerializer, RoomAmenitySerializer, RoomAvailabilitySerializer,
    RoomImageSerializer, FavoriteSerializer, BnBFavoriteSerializer,
    BnBListingSerializer, BnBListingListSerializer,
    BnBImageSerializer, BnBAvailabilitySerializer,
)


class HotelListCreateView(generics.ListCreateAPIView):
    """
    List all hotels or create a new hotel
    """
    queryset = Hotel.objects.filter(is_active=True).select_related('host').prefetch_related('images', 'amenity_mappings__amenity')
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'star_rating', 'city', 'country', 'is_verified', 'is_featured']
    search_fields = ['name', 'description', 'city', 'country']
    ordering_fields = ['created_at', 'star_rating', 'name']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return HotelListSerializer
        return HotelSerializer
    
    def perform_create(self, serializer):
        """Assign the current user as the host"""
        serializer.save(host=self.request.user)
        user = self.request.user
        if not user.has_role(user.Role.HOTEL_HOST):
            user.add_role(user.Role.HOTEL_HOST)
            if user.active_role == user.Role.GUEST:
                user.active_role = user.Role.HOTEL_HOST
            user.save()


class HotelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a hotel
    """
    queryset = Hotel.objects.filter(is_active=True).select_related('host').prefetch_related('images', 'amenity_mappings__amenity')
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return HotelDetailSerializer
        return HotelSerializer
    
    def perform_update(self, serializer):
        """Only allow the host to update their hotel"""
        if serializer.instance.host != self.request.user:
            raise PermissionDenied("You can only update your own hotels")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Soft delete - set is_active to False"""
        if instance.host != self.request.user:
            raise PermissionDenied("You can only delete your own hotels")
        instance.is_active = False
        instance.save()


class HotelAmenityListView(generics.ListAPIView):
    """
    List all hotel amenities
    """
    queryset = HotelAmenity.objects.filter(is_active=True)
    serializer_class = HotelAmenitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'description']


class HotelImageListCreateView(generics.ListCreateAPIView):
    """List and create images for a hotel"""
    serializer_class = HotelImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.kwargs['hotel_id']
        return HotelImage.objects.filter(hotel_id=hotel_id)

    def perform_create(self, serializer):
        hotel_id = self.kwargs['hotel_id']
        hotel = get_object_or_404(Hotel, pk=hotel_id)
        if hotel.host != self.request.user:
            raise PermissionDenied("You can only add images to your own hotels")
        serializer.save(hotel=hotel)


class HotelImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a hotel image"""
    serializer_class = HotelImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.kwargs['hotel_id']
        return HotelImage.objects.filter(hotel_id=hotel_id)

    def perform_update(self, serializer):
        if serializer.instance.hotel.host != self.request.user:
            raise PermissionDenied("You can only update images for your own hotels")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.hotel.host != self.request.user:
            raise PermissionDenied("You can only delete images from your own hotels")
        instance.delete()


class HotelAmenityMappingListCreateView(generics.ListCreateAPIView):
    """List and create amenity mappings for a hotel"""
    serializer_class = HotelAmenityMappingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.kwargs['hotel_id']
        return HotelAmenityMapping.objects.filter(hotel_id=hotel_id).select_related('amenity').order_by('id')

    def perform_create(self, serializer):
        hotel_id = self.kwargs['hotel_id']
        hotel = get_object_or_404(Hotel, pk=hotel_id)
        if hotel.host != self.request.user:
            raise PermissionDenied("You can only add amenities to your own hotels")
        serializer.save(hotel=hotel)


class HotelAmenityMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a hotel amenity mapping"""
    serializer_class = HotelAmenityMappingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hotel_id = self.kwargs['hotel_id']
        return HotelAmenityMapping.objects.filter(hotel_id=hotel_id).select_related('amenity')

    def perform_update(self, serializer):
        if serializer.instance.hotel.host != self.request.user:
            raise PermissionDenied("You can only update amenities for your own hotels")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.hotel.host != self.request.user:
            raise PermissionDenied("You can only delete amenities from your own hotels")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def featured_hotels(request):
    """
    Get featured hotels
    """
    hotels = Hotel.objects.filter(
        is_active=True,
        is_featured=True,
        is_verified=True
    ).select_related('host').prefetch_related('images', 'amenity_mappings__amenity')[:6]
    
    serializer = HotelListSerializer(hotels, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def search_hotels(request):
    """
    Advanced hotel search with filters
    """
    queryset = Hotel.objects.filter(is_active=True).select_related('host').prefetch_related('images', 'amenity_mappings__amenity')
    
    # Get query parameters
    city = request.query_params.get('city')
    country = request.query_params.get('country')
    property_type = request.query_params.get('property_type')
    min_stars = request.query_params.get('min_stars')
    max_stars = request.query_params.get('max_stars')
    search = request.query_params.get('search')
    amenities = request.query_params.getlist('amenities')
    
    # Apply filters
    if city:
        queryset = queryset.filter(city__icontains=city)
    
    if country:
        queryset = queryset.filter(country__icontains=country)
    
    if property_type:
        queryset = queryset.filter(property_type=property_type)
    
    if min_stars:
        queryset = queryset.filter(star_rating__gte=min_stars)
    
    if max_stars:
        queryset = queryset.filter(star_rating__lte=max_stars)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(city__icontains=search) |
            Q(country__icontains=search)
        )
    
    if amenities:
        queryset = queryset.filter(amenity_mappings__amenity__id__in=amenities)
    
    # Order by featured first, then by creation date
    queryset = queryset.order_by('-is_featured', '-created_at')
    
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = HotelListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# Room Views
class RoomTypeListCreateView(generics.ListCreateAPIView):
    """
    List all room types or create a new room type
    """
    queryset = RoomType.objects.filter(is_active=True).select_related('hotel').prefetch_related('images', 'amenity_mappings__amenity')
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['hotel', 'category', 'bed_type', 'is_available']
    search_fields = ['name', 'description', 'hotel__name']
    ordering_fields = ['base_price', 'max_occupancy', 'created_at']
    ordering = ['base_price']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return RoomTypeListSerializer
        return RoomTypeSerializer
    
    def perform_create(self, serializer):
        """Assign the hotel from URL parameter or payload"""
        hotel_id = self.kwargs.get('hotel_id')
        target_hotel_id = hotel_id or serializer.validated_data.get('hotel_id')
        if not target_hotel_id:
            raise ValidationError({'hotel_id': 'hotel_id is required'})
        hotel = get_object_or_404(Hotel, pk=target_hotel_id)
        if hotel.host != self.request.user:
            raise PermissionDenied("You can only add room types to your own hotels")

        if hotel_id:
            serializer.save(hotel_id=hotel_id)
        else:
            # If no hotel_id in URL, use the one from the payload
            serializer.save()


class RoomTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a room type
    """
    queryset = RoomType.objects.filter(is_active=True).select_related('hotel').prefetch_related('images', 'amenity_mappings__amenity')
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return RoomTypeDetailSerializer
        return RoomTypeSerializer
    
    def perform_update(self, serializer):
        """Only allow the hotel host to update their room types"""
        if serializer.instance.hotel.host != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only update room types for your own hotels")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Soft delete - set is_active to False"""
        if instance.hotel.host != self.request.user:
            raise PermissionDenied("You can only delete room types from your own hotels")
        instance.is_active = False
        instance.save()


class HotelRoomTypesView(generics.ListAPIView):
    """
    List all room types for a specific hotel
    """
    serializer_class = RoomTypeListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'bed_type', 'is_available']
    ordering_fields = ['base_price', 'max_occupancy']
    ordering = ['base_price']
    
    def get_queryset(self):
        hotel_id = self.kwargs['hotel_id']
        return RoomType.objects.filter(
            hotel_id=hotel_id,
            is_active=True
        ).select_related('hotel').prefetch_related('images', 'amenity_mappings__amenity')


class RoomImageListCreateView(generics.ListCreateAPIView):
    """List and create images for a room type"""
    serializer_class = RoomImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_type_id = self.kwargs['room_type_id']
        return RoomImage.objects.filter(room_type_id=room_type_id)

    def perform_create(self, serializer):
        room_type_id = self.kwargs['room_type_id']
        room_type = RoomType.objects.get(pk=room_type_id)
        
        # Check ownership - user must own the hotel that owns this room type
        if room_type.hotel.host != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only add images to room types in your own hotels")
        
        serializer.save(room_type=room_type)


class RoomImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a room image"""
    serializer_class = RoomImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_type_id = self.kwargs['room_type_id']
        return RoomImage.objects.filter(room_type_id=room_type_id)

    def perform_update(self, serializer):
        if serializer.instance.room_type.hotel.host != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only update images for room types in your own hotels")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.room_type.hotel.host != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete images from room types in your own hotels")
        instance.delete()


class RoomAmenityListView(generics.ListAPIView):
    """
    List all room amenities
    """
    queryset = RoomAmenity.objects.filter(is_active=True)
    serializer_class = RoomAmenitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'description']


class MyHotelListingsView(generics.ListAPIView):
    """
    List hotels owned by the current authenticated user
    """
    serializer_class = HotelListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'star_rating', 'city', 'country', 'is_verified', 'is_featured']
    search_fields = ['name', 'description', 'city', 'country']
    ordering_fields = ['created_at', 'star_rating', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        return Hotel.objects.filter(
            is_active=True,
            host=self.request.user
        ).select_related('host').prefetch_related('images', 'amenity_mappings__amenity')


class FavoriteListCreateView(generics.ListCreateAPIView):
    """
    List current user's favorites; add new favorite
    """
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related('hotel').order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class FavoriteDeleteView(generics.DestroyAPIView):
    """
    Remove a favorite by hotel id for current user
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        hotel_id = self.kwargs['hotel_id']
        return get_object_or_404(Favorite, user=self.request.user, hotel_id=hotel_id)


class BnBFavoriteListCreateView(generics.ListCreateAPIView):
    """
    List current user's BnB favorites; add new BnB favorite
    """
    serializer_class = BnBFavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BnBFavorite.objects.filter(user=self.request.user).select_related('bnb_listing').order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class BnBFavoriteDeleteView(generics.DestroyAPIView):
    """
    Remove a BnB favorite by listing id for current user
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        bnb_listing_id = self.kwargs['bnb_listing_id']
        return get_object_or_404(BnBFavorite, user=self.request.user, bnb_listing_id=bnb_listing_id)


class CombinedFavoriteListView(APIView):
    """
    List current user's favorites across hotels and BnB listings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hotel_favorites = Favorite.objects.filter(user=request.user).select_related('hotel').order_by('-created_at')
        bnb_favorites = BnBFavorite.objects.filter(user=request.user).select_related('bnb_listing').order_by('-created_at')

        hotel_data = FavoriteSerializer(
            hotel_favorites, many=True, context={'request': request}
        ).data
        bnb_data = BnBFavoriteSerializer(
            bnb_favorites, many=True, context={'request': request}
        ).data

        combined = (
            [{'type': 'hotel', **item} for item in hotel_data] +
            [{'type': 'bnb', **item} for item in bnb_data]
        )
        combined.sort(key=lambda item: item.get('created_at', ''), reverse=True)
        return Response({'results': combined}, status=status.HTTP_200_OK)


# --- New: BnB API Views ---
class BnBListingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'city', 'country', 'property_type', 'is_active', 'is_verified', 'is_featured',
        'bedrooms', 'bathrooms', 'max_guests', 'pets_allowed', 'smoking_allowed'
    ]
    search_fields = ['title', 'description', 'city', 'country', 'address']
    ordering_fields = ['created_at', 'price_per_night', 'title', 'max_guests']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BnBListingListSerializer
        return BnBListingSerializer

    def get_queryset(self):
        queryset = BnBListing.objects.filter(is_active=True).select_related('host').prefetch_related('images')
        
        # Price range filtering
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price_per_night__gte=min_price)
        if max_price:
            queryset = queryset.filter(price_per_night__lte=max_price)
        
        # Amenities filtering (if amenities query param provided)
        amenities = self.request.query_params.getlist('amenities')
        if amenities:
            # Filter listings that have all specified amenities. Done in Python
            # rather than a JSONField __contains lookup, since that lookup is
            # only supported on PostgreSQL, not SQLite.
            matching_ids = [
                listing.id for listing in queryset
                if all(amenity in (listing.amenities or []) for amenity in amenities)
            ]
            queryset = queryset.filter(id__in=matching_ids)

        return queryset

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)
        user = self.request.user
        if not user.has_role(user.Role.BNB_HOST):
            user.add_role(user.Role.BNB_HOST)
            if user.active_role == user.Role.GUEST:
                user.active_role = user.Role.BNB_HOST
            user.save()


class MyBnBListingsView(generics.ListAPIView):
    serializer_class = BnBListingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BnBListing.objects.filter(host=self.request.user).select_related('host').prefetch_related('images')


class BnBListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BnBListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = BnBListing.objects.select_related('host').prefetch_related('images', 'availability')

    def perform_update(self, serializer):
        if serializer.instance.host != self.request.user:
            raise PermissionDenied("You can only update your own BnB listings")
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class BnBImageListCreateView(generics.ListCreateAPIView):
    """List and create images for a BnB listing"""
    serializer_class = BnBImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        bnb_id = self.kwargs['bnb_id']
        return BnBImage.objects.filter(bnb_listing_id=bnb_id)

    def perform_create(self, serializer):
        bnb_id = self.kwargs['bnb_id']
        bnb_listing = BnBListing.objects.get(pk=bnb_id)
        
        # Check ownership
        if bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only add images to your own BnB listings")
        
        try:
            serializer.save(bnb_listing=bnb_listing)
        except Exception as exc:
            # Return a handled API error instead of a raw 500 for upload failures.
            raise ValidationError({'image': f'Upload failed: {str(exc)}'}) from exc


class BnBImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a BnB image"""
    serializer_class = BnBImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        bnb_id = self.kwargs['bnb_id']
        return BnBImage.objects.filter(bnb_listing_id=bnb_id)

    def perform_update(self, serializer):
        if serializer.instance.bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only update images for your own BnB listings")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only delete images from your own BnB listings")
        instance.delete()


class BnBAvailabilityListCreateView(generics.ListCreateAPIView):
    """List and create availability entries for a BnB listing"""
    serializer_class = BnBAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        bnb_id = self.kwargs['bnb_id']
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        queryset = BnBAvailability.objects.filter(bnb_listing_id=bnb_id)
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('date')

    def perform_create(self, serializer):
        bnb_id = self.kwargs['bnb_id']
        bnb_listing = BnBListing.objects.get(pk=bnb_id)
        
        # Check ownership
        if bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only manage availability for your own BnB listings")
        
        serializer.save(bnb_listing=bnb_listing)


class BnBAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a BnB availability entry"""
    serializer_class = BnBAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        bnb_id = self.kwargs['bnb_id']
        return BnBAvailability.objects.filter(bnb_listing_id=bnb_id)

    def perform_update(self, serializer):
        if serializer.instance.bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only update availability for your own BnB listings")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.bnb_listing.host != self.request.user:
            raise PermissionDenied("You can only delete availability for your own BnB listings")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def bnb_availability(request, bnb_id):
    """
    Get BnB availability for a specific listing
    """
    from datetime import datetime, timedelta
    
    # Get query parameters
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    # Default to next 30 days if no dates provided
    if not start_date:
        start_date = datetime.now().date()
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    
    if not end_date:
        end_date = start_date + timedelta(days=30)
    else:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    # Get availability for the date range
    availability = BnBAvailability.objects.filter(
        bnb_listing_id=bnb_id,
        date__range=[start_date, end_date]
    ).order_by('date')
    
    serializer = BnBAvailabilitySerializer(availability, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def search_available_bnbs(request):
    """
    Search for available BnBs based on criteria
    """
    from datetime import datetime, timedelta
    
    # Get query parameters
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    city = request.query_params.get('city')
    country = request.query_params.get('country')
    guests = int(request.query_params.get('guests', 1))
    min_price = request.query_params.get('min_price')
    max_price = request.query_params.get('max_price')
    property_type = request.query_params.get('property_type')
    amenities = request.query_params.getlist('amenities')
    
    # Build queryset
    queryset = BnBListing.objects.filter(
        is_active=True,
        max_guests__gte=guests
    ).select_related('host').prefetch_related('images')
    
    if city:
        queryset = queryset.filter(city__icontains=city)
    if country:
        queryset = queryset.filter(country__icontains=country)
    if property_type:
        queryset = queryset.filter(property_type=property_type)
    if min_price:
        queryset = queryset.filter(price_per_night__gte=min_price)
    if max_price:
        queryset = queryset.filter(price_per_night__lte=max_price)
    if amenities:
        # Filter listings that have all specified amenities. Done in Python
        # rather than a JSONField __contains lookup, since that lookup is
        # only supported on PostgreSQL, not SQLite.
        matching_ids = [
            bnb.id for bnb in queryset
            if all(amenity in (bnb.amenities or []) for amenity in amenities)
        ]
        queryset = queryset.filter(id__in=matching_ids)

    # Filter by availability if dates provided
    if check_in and check_out:
        try:
            check_in_date = datetime.strptime(check_in, '%Y-%m-%d').date()
            check_out_date = datetime.strptime(check_out, '%Y-%m-%d').date()
            
            if check_in_date >= check_out_date:
                return Response({'error': 'check_out must be after check_in'}, status=400)
            
            # Filter BnBs that are available for the entire date range
            available_bnbs = []
            for bnb in queryset:
                is_available = True
                current_date = check_in_date
                while current_date < check_out_date:
                    availability = BnBAvailability.objects.filter(
                        bnb_listing=bnb,
                        date=current_date
                    ).first()
                    
                    if availability and not availability.is_available:
                        is_available = False
                        break
                    
                    current_date += timedelta(days=1)
                
                if is_available:
                    available_bnbs.append(bnb)
            
            queryset = BnBListing.objects.filter(id__in=[bnb.id for bnb in available_bnbs])
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    serializer = BnBListingListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def room_availability(request, room_type_id):
    """
    Get room availability for a specific room type
    """
    from datetime import datetime, timedelta
    
    # Get query parameters
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    
    # Default to next 30 days if no dates provided
    if not start_date:
        start_date = datetime.now().date()
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    
    if not end_date:
        end_date = start_date + timedelta(days=30)
    else:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    # Get availability for the date range
    availability = RoomAvailability.objects.filter(
        room_type_id=room_type_id,
        date__range=[start_date, end_date]
    ).order_by('date')
    
    serializer = RoomAvailabilitySerializer(availability, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def search_available_rooms(request):
    """
    Search for available rooms based on criteria
    """
    from datetime import datetime, timedelta
    
    # Get query parameters
    hotel_id = request.query_params.get('hotel_id')
    check_in = request.query_params.get('check_in')
    check_out = request.query_params.get('check_out')
    adults = int(request.query_params.get('adults', 1))
    children = int(request.query_params.get('children', 0))
    room_category = request.query_params.get('category')
    max_price = request.query_params.get('max_price')
    
    # Validate dates
    if not check_in or not check_out:
        return Response({'error': 'check_in and check_out dates are required'}, status=400)
    
    try:
        check_in_date = datetime.strptime(check_in, '%Y-%m-%d').date()
        check_out_date = datetime.strptime(check_out, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    if check_in_date >= check_out_date:
        return Response({'error': 'check_out must be after check_in'}, status=400)
    
    # Build queryset
    queryset = RoomType.objects.filter(
        is_active=True,
        is_available=True,
        max_adults__gte=adults,
        max_children__gte=children
    ).select_related('hotel').prefetch_related('images', 'amenity_mappings__amenity')
    
    if hotel_id:
        queryset = queryset.filter(hotel_id=hotel_id)
    
    if room_category:
        queryset = queryset.filter(category=room_category)
    
    if max_price:
        queryset = queryset.filter(base_price__lte=max_price)
    
    # Filter by availability for the date range
    available_rooms = []
    for room_type in queryset:
        # Check availability for each day in the range
        is_available = True
        current_date = check_in_date
        while current_date < check_out_date:
            availability = RoomAvailability.objects.filter(
                room_type=room_type,
                date=current_date
            ).first()
            
            if not availability or not availability.is_available:
                is_available = False
                break
            
            current_date += timedelta(days=1)
        
        if is_available:
            available_rooms.append(room_type)
    
    serializer = RoomTypeListSerializer(available_rooms, many=True)
    return Response(serializer.data)
