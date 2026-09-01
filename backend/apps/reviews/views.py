"""
Views for reviews app
"""
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Review
from .serializers import ReviewSerializer, ReviewListSerializer, HotelReviewStatsSerializer


class ReviewListCreateView(generics.ListCreateAPIView):
    queryset = Review.objects.filter(is_public=True).select_related('traveler', 'hotel', 'bnb_listing', 'room_type')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = []
    filterset_fields = ['hotel', 'bnb_listing', 'room_type', 'rating']
    search_fields = ['title', 'comment']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ReviewListSerializer
        return ReviewSerializer

    def perform_create(self, serializer):
        serializer.save()


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.filter(is_public=True).select_related('traveler', 'hotel', 'bnb_listing', 'room_type')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ReviewListSerializer
        return ReviewSerializer

    def get_queryset(self):
        # Users can only edit their own reviews
        if self.request.user.is_authenticated:
            return super().get_queryset().filter(
                Q(traveler=self.request.user) | Q(is_public=True)
            )
        return super().get_queryset()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def hotel_review_stats(request, hotel_id):
    """
    Get review statistics for a hotel
    """
    reviews = Review.objects.filter(hotel_id=hotel_id, is_public=True)
    
    if not reviews.exists():
        return Response({
            'total_reviews': 0,
            'average_rating': 0.0,
            'rating_distribution': {str(i): 0 for i in range(1, 6)}
        })

    # Calculate stats
    total_reviews = reviews.count()
    average_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0.0
    
    # Rating distribution
    rating_dist = {}
    for i in range(1, 6):
        count = reviews.filter(rating=i).count()
        rating_dist[str(i)] = count

    stats = {
        'total_reviews': total_reviews,
        'average_rating': round(float(average_rating), 2),
        'rating_distribution': rating_dist
    }

    serializer = HotelReviewStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def hotel_reviews(request, hotel_id):
    """
    Get all reviews for a specific hotel
    """
    reviews = Review.objects.filter(
        hotel_id=hotel_id, 
        is_public=True
    ).select_related('traveler', 'room_type').order_by('-created_at')
    
    # Filter by rating if provided
    rating = request.query_params.get('rating')
    if rating:
        reviews = reviews.filter(rating=rating)
    
    serializer = ReviewListSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def bnb_review_stats(request, bnb_id):
    """
    Get review statistics for a BnB listing
    """
    reviews = Review.objects.filter(bnb_listing_id=bnb_id, is_public=True)
    
    if not reviews.exists():
        return Response({
            'total_reviews': 0,
            'average_rating': 0.0,
            'rating_distribution': {str(i): 0 for i in range(1, 6)}
        })

    # Calculate stats
    total_reviews = reviews.count()
    average_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0.0
    
    # Rating distribution
    rating_dist = {}
    for i in range(1, 6):
        count = reviews.filter(rating=i).count()
        rating_dist[str(i)] = count

    stats = {
        'total_reviews': total_reviews,
        'average_rating': round(float(average_rating), 2),
        'rating_distribution': rating_dist
    }

    serializer = HotelReviewStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def bnb_reviews(request, bnb_id):
    """
    Get all reviews for a specific BnB listing
    """
    reviews = Review.objects.filter(
        bnb_listing_id=bnb_id, 
        is_public=True
    ).select_related('traveler').order_by('-created_at')
    
    # Filter by rating if provided
    rating = request.query_params.get('rating')
    if rating:
        reviews = reviews.filter(rating=rating)
    
    serializer = ReviewListSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['POST', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def host_reply_to_review(request, pk):
    """
    Allow hosts to post/update a reply on reviews for their own hotel/BnB listings.
    """
    try:
        review = Review.objects.select_related('hotel', 'bnb_listing').get(pk=pk, is_public=True)
    except Review.DoesNotExist:
        return Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_owner = (
        (review.hotel and review.hotel.host_id == request.user.id) or
        (review.bnb_listing and review.bnb_listing.host_id == request.user.id)
    )
    if not is_owner:
        return Response({'detail': 'You can only reply to reviews on your own listings.'}, status=status.HTTP_403_FORBIDDEN)

    reply = (request.data.get('reply') or '').strip()
    if not reply:
        return Response({'reply': ['Reply text is required.']}, status=status.HTTP_400_BAD_REQUEST)

    review.host_reply = reply
    review.host_reply_updated_at = timezone.now()
    review.save(update_fields=['host_reply', 'host_reply_updated_at', 'updated_at'])

    return Response(ReviewListSerializer(review).data, status=status.HTTP_200_OK)
