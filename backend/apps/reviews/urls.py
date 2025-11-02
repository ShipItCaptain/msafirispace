from django.urls import path
from .views import (
    ReviewListCreateView, 
    ReviewDetailView, 
    hotel_review_stats, 
    hotel_reviews
)

app_name = 'reviews'

urlpatterns = [
    path('', ReviewListCreateView.as_view(), name='review-list-create'),
    path('<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('hotel/<int:hotel_id>/stats/', hotel_review_stats, name='hotel-review-stats'),
    path('hotel/<int:hotel_id>/', hotel_reviews, name='hotel-reviews'),
]