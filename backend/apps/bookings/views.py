"""
Views for bookings app
"""
from datetime import datetime
import logging
from django.db.models import Q
from django.conf import settings
from django.core.mail import send_mail

from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Booking
from .serializers import (
    BookingSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    HostBookingListSerializer,
)
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


def notify_host_about_booking(booking: Booking):
    host = getattr(booking.hotel, 'host', None)
    if not host:
        return

    stay_name = booking.hotel.name if booking.hotel_id else 'your property'
    title = 'New hotel booking request'
    message = (
        f'{booking.guest_full_name} requested to book {stay_name} '
        f'from {booking.check_in} to {booking.check_out}.'
    )

    Notification.objects.create(
        user=host,
        title=title,
        message=message,
        notification_type=Notification.Type.INFO,
        data={
            'booking_id': booking.id,
            'hotel_id': booking.hotel_id,
            'channel_status': {
                'in_app': 'sent',
                'email': 'queued',
                'whatsapp': 'pending',
            },
        },
    )

    if host.email:
        try:
            send_mail(
                title,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [host.email],
                fail_silently=True,
            )
        except Exception:
            logger.exception(
                "Booking host email failed",
                extra={"booking_id": booking.id, "host_id": host.id},
            )


class BookingListCreateView(generics.ListCreateAPIView):
    queryset = Booking.objects.select_related('traveler', 'hotel', 'room_type', 'bnb_listing')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BookingListSerializer
        return BookingSerializer
    
    def get_queryset(self):
        return super().get_queryset().filter(traveler=self.request.user)

    def perform_create(self, serializer):
        data = serializer.validated_data
        check_in = data['check_in']
        check_out = data['check_out']
        if check_in >= check_out:
            raise ValidationError({'check_out': 'check_out must be after check_in'})

        # The serializer's create method handles pricing and totals
        # Just set the traveler here
        booking = serializer.save(traveler=self.request.user)
        if booking.hotel_id:
            notify_host_about_booking(booking)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError:
            logger.warning(
                "Booking creation validation failed",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": getattr(request.user, "id", None),
                    "path": request.path,
                    "method": request.method,
                },
            )
            raise
        except Exception:
            logger.exception(
                "Booking creation crashed",
                extra={
                    "request_id": getattr(request, "request_id", None),
                    "user_id": getattr(request.user, "id", None),
                    "path": request.path,
                    "method": request.method,
                },
            )
            raise


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.select_related('traveler', 'hotel', 'room_type', 'bnb_listing')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        # Users can only access their own bookings
        return super().get_queryset().filter(traveler=self.request.user)
    
    def perform_destroy(self, instance):
        # Soft delete - set status to cancelled
        if instance.status not in ['completed', 'cancelled']:
            instance.status = Booking.BookingStatus.CANCELLED
            instance.save()
        else:
            raise ValidationError('Cannot cancel a booking that is already completed or cancelled')


class MyBookingsListView(generics.ListAPIView):
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.select_related(
            'traveler', 'hotel', 'room_type', 'bnb_listing'
        ).filter(traveler=self.request.user)


class HostBookingsListView(generics.ListAPIView):
    """
    List bookings for listings owned by current host user.
    Includes both hotel and BnB bookings.
    """
    serializer_class = HostBookingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.select_related(
            'traveler', 'hotel', 'room_type', 'bnb_listing'
        ).filter(
            Q(hotel__host=self.request.user) | Q(bnb_listing__host=self.request.user)
        ).order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def host_update_booking_status(request, pk):
    """
    Allow a host to update booking status for bookings on their own properties.
    """
    new_status = request.data.get('status')
    allowed_statuses = {
        Booking.BookingStatus.CONFIRMED,
        Booking.BookingStatus.CANCELLED,
        Booking.BookingStatus.COMPLETED,
    }
    if new_status not in allowed_statuses:
        return Response(
            {'detail': 'Invalid status. Allowed: confirmed, cancelled, completed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        booking = Booking.objects.select_related('hotel', 'bnb_listing').get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    owns_hotel_booking = booking.hotel_id and booking.hotel and booking.hotel.host_id == request.user.id
    owns_bnb_booking = booking.bnb_listing_id and booking.bnb_listing and booking.bnb_listing.host_id == request.user.id

    if not (owns_hotel_booking or owns_bnb_booking):
        return Response({'detail': 'You do not have permission for this booking'}, status=status.HTTP_403_FORBIDDEN)

    if booking.status == Booking.BookingStatus.CANCELLED and new_status != Booking.BookingStatus.CANCELLED:
        return Response({'detail': 'Cancelled bookings cannot be changed.'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = new_status
    booking.save(update_fields=['status', 'updated_at'])

    if new_status == Booking.BookingStatus.CONFIRMED:
        Notification.objects.create(
            user=booking.traveler,
            title='Booking approved',
            message=f'Your booking #{booking.id} has been approved by the host.',
            notification_type=Notification.Type.SUCCESS,
            data={'booking_id': booking.id},
        )
    elif new_status == Booking.BookingStatus.CANCELLED:
        Notification.objects.create(
            user=booking.traveler,
            title='Booking update',
            message=f'Your booking #{booking.id} was declined or cancelled by the host.',
            notification_type=Notification.Type.WARNING,
            data={'booking_id': booking.id},
        )

    serializer = BookingDetailSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_booking(request, pk):
    """Cancel a booking"""
    try:
        booking = Booking.objects.get(pk=pk, traveler=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if booking.status == Booking.BookingStatus.CANCELLED:
        return Response({'detail': 'Booking is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)
    
    if booking.status == Booking.BookingStatus.COMPLETED:
        return Response({'detail': 'Cannot cancel a completed booking'}, status=status.HTTP_400_BAD_REQUEST)
    
    booking.status = Booking.BookingStatus.CANCELLED
    booking.save()
    
    serializer = BookingDetailSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)
