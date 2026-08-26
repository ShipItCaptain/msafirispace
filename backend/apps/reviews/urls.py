from django.urls import path
from .views import (
    ReviewListCreateView, 
    ReviewDetailView, 
    hotel_review_stats, 
    hotel_reviews,
    bnb_review_stats,
    bnb_reviews,
    host_reply_to_review,
)

app_name = 'reviews'

urlpatterns = [
    path('', ReviewListCreateView.as_view(), name='review-list-create'),
    path('<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('hotel/<int:hotel_id>/stats/', hotel_review_stats, name='hotel-review-stats'),
    path('hotel/<int:hotel_id>/', hotel_reviews, name='hotel-reviews'),
    path('bnb/<int:bnb_id>/stats/', bnb_review_stats, name='bnb-review-stats'),
    path('bnb/<int:bnb_id>/', bnb_reviews, name='bnb-reviews'),
    path('<int:pk>/reply/', host_reply_to_review, name='host-reply-review'),
]
