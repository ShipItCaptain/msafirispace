"""
Views for promotions app
"""
from django.utils import timezone
from django.views.decorators.cache import cache_page
from rest_framework import generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.listings.models import Hotel
from .models import Promotion, PromotionSlot
from .serializers import PromotionSerializer, PromotionListSerializer, PromotionSlotSerializer


class PromotionListCreateView(generics.ListCreateAPIView):
    queryset = Promotion.objects.select_related('provider', 'hotel').prefetch_related('hotel__images')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['promotion_type', 'status', 'hotel', 'provider']
    search_fields = ['title', 'description', 'hotel__name', 'hotel__city']
    ordering_fields = ['created_at', 'original_price', 'discounted_price', 'views_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PromotionListSerializer
        return PromotionSerializer

    def perform_create(self, serializer):
        hotel_id = serializer.validated_data.get('hotel_id')
        try:
            hotel = Hotel.objects.get(pk=hotel_id)
        except Hotel.DoesNotExist:
            raise ValidationError({'hotel_id': 'Hotel not found.'})
        # Without this check any authenticated user could create a
        # promotion against a hotel_id they don't own.
        if hotel.host_id != self.request.user.id:
            raise PermissionDenied("You can only create promotions for your own hotels.")
        serializer.save(provider=self.request.user)


class PromotionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Promotion.objects.select_related('provider', 'hotel').prefetch_related('hotel__images')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PromotionListSerializer
        return PromotionSerializer

    def get_queryset(self):
        # Anyone can view a promotion's detail; only the owning provider can
        # edit/delete it. Scoping the queryset on GET too (as this used to)
        # meant an authenticated non-owner got a 404 on someone else's
        # promotion while a logged-out visitor could see it fine.
        if self.request.method not in permissions.SAFE_METHODS and self.request.user.is_authenticated:
            return super().get_queryset().filter(provider=self.request.user)
        return super().get_queryset()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@cache_page(90)  # matches apps.listings.views.LISTING_CACHE_SECONDS for this same homepage load
def active_promotions(request, promotion_type):
    """
    Get active promotions by type (trending, last_minute, local_favorites)
    """
    now = timezone.now()
    promotions = Promotion.objects.filter(
        promotion_type=promotion_type,
        status=Promotion.Status.ACTIVE,
        start_date__lte=now,
        end_date__gte=now
    ).select_related('hotel').prefetch_related('hotel__images').order_by('-created_at')[:6]

    serializer = PromotionListSerializer(promotions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def track_promotion_view(request, promotion_id):
    """
    Track a promotion view (increment views_count)
    """
    try:
        promotion = Promotion.objects.get(pk=promotion_id)
        promotion.views_count += 1
        promotion.save(update_fields=['views_count'])
        return Response({'success': True})
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion not found'}, status=404)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def track_promotion_click(request, promotion_id):
    """
    Track a promotion click (increment clicks_count)
    """
    try:
        promotion = Promotion.objects.get(pk=promotion_id)
        promotion.clicks_count += 1
        promotion.save(update_fields=['clicks_count'])
        return Response({'success': True})
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion not found'}, status=404)


class PromotionSlotListCreateView(generics.ListCreateAPIView):
    queryset = PromotionSlot.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PromotionSlotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['promotion_type', 'slot_type', 'is_active']


class PromotionSlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PromotionSlot.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PromotionSlotSerializer
