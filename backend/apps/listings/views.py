"""
Views for listings app
"""
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from .models import Hotel, HotelAmenity, RoomType, RoomAmenity, RoomAvailability, Favorite, BnBListing
from .serializers import (
    HotelSerializer, HotelListSerializer, HotelDetailSerializer,
    HotelAmenitySerializer, RoomTypeSerializer, RoomTypeListSerializer,
    RoomTypeDetailSerializer, RoomAmenitySerializer, RoomAvailabilitySerializer,
    FavoriteSerializer, BnBListingSerializer,
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
            raise PermissionError("You can only update your own hotels")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Soft delete - set is_active to False"""
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
            raise PermissionError("You can only update room types for your own hotels")
        serializer.save()
    
    def perform_destroy(self, serializer):
        """Soft delete - set is_active to False"""
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
        return Favorite.objects.filter(user=self.request.user).select_related('hotel')

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
        return Favorite.objects.get(user=self.request.user, hotel_id=hotel_id)


# --- New: BnB API Views ---
class BnBListingListCreateView(generics.ListCreateAPIView):
    serializer_class = BnBListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'country', 'is_active']
    search_fields = ['title', 'description', 'city', 'country']
    ordering_fields = ['created_at', 'price_per_night', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        return BnBListing.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)


class MyBnBListingsView(generics.ListAPIView):
    serializer_class = BnBListingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BnBListing.objects.filter(host=self.request.user)


class BnBListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BnBListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = BnBListing.objects.all()

    def perform_update(self, serializer):
        if serializer.instance.host != self.request.user:
            raise PermissionError("You can only update your own BnB listings")
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


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
