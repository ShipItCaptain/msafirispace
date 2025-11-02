"""
Views for concierge app
"""
from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ServiceRequest, ServiceOffer
from .serializers import (
    ServiceRequestSerializer, ServiceRequestListSerializer,
    ServiceOfferSerializer, ServiceOfferListSerializer
)


class ServiceRequestListCreateView(generics.ListCreateAPIView):
    queryset = ServiceRequest.objects.select_related('traveler')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['request_type', 'status', 'location']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'budget_min', 'budget_max']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ServiceRequestListSerializer
        return ServiceRequestSerializer

    def perform_create(self, serializer):
        serializer.save(traveler=self.request.user)


class ServiceRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ServiceRequest.objects.select_related('traveler')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ServiceRequestListSerializer
        return ServiceRequestSerializer

    def get_queryset(self):
        # Users can only edit their own requests
        if self.request.user.is_authenticated:
            return super().get_queryset().filter(traveler=self.request.user)
        return super().get_queryset()


class ServiceOfferListCreateView(generics.ListCreateAPIView):
    queryset = ServiceOffer.objects.select_related('provider', 'service_request')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['service_request', 'provider', 'status']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'price']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ServiceOfferListSerializer
        return ServiceOfferSerializer

    def perform_create(self, serializer):
        serializer.save(provider=self.request.user)


class ServiceOfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ServiceOffer.objects.select_related('provider', 'service_request')
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ServiceOfferListSerializer
        return ServiceOfferSerializer

    def get_queryset(self):
        # Users can only edit their own offers
        if self.request.user.is_authenticated:
            return super().get_queryset().filter(provider=self.request.user)
        return super().get_queryset()
