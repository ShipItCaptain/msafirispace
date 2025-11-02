from django.urls import path
from .views import (
    ServiceRequestListCreateView,
    ServiceRequestDetailView,
    ServiceOfferListCreateView,
    ServiceOfferDetailView
)

app_name = 'concierge'

urlpatterns = [
    # Service Requests
    path('requests/', ServiceRequestListCreateView.as_view(), name='service-request-list-create'),
    path('requests/<int:pk>/', ServiceRequestDetailView.as_view(), name='service-request-detail'),
    
    # Service Offers
    path('offers/', ServiceOfferListCreateView.as_view(), name='service-offer-list-create'),
    path('offers/<int:pk>/', ServiceOfferDetailView.as_view(), name='service-offer-detail'),
]