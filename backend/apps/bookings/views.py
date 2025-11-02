"""
Views for bookings app
"""
from datetime import datetime

from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Booking
from .serializers import BookingSerializer, BookingListSerializer, BookingDetailSerializer


class BookingListCreateView(generics.ListCreateAPIView):
    queryset = Booking.objects.select_related('traveler', 'hotel', 'room_type')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BookingListSerializer
        return BookingSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        check_in = data['check_in']
        check_out = data['check_out']
        if check_in >= check_out:
            raise ValidationError({'check_out': 'check_out must be after check_in'})

        # derive nights and totals if not provided
        total_nights = (check_out - check_in).days
        nightly_price = data.get('nightly_price')
        if nightly_price is None:
            nightly_price = data['room_type'].base_price
        total_amount = nightly_price * total_nights

        serializer.save(
            traveler=self.request.user,
            hotel=data['room_type'].hotel,
            total_nights=total_nights,
            nightly_price=nightly_price,
            total_amount=total_amount,
            currency=data['room_type'].currency,
        )


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.select_related('traveler', 'hotel', 'room_type')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        # Users can only access their own bookings
        return super().get_queryset().filter(traveler=self.request.user)


