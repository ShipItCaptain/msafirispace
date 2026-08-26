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
    is_hotel_booking = bool(booking.hotel_id)
    host = getattr(booking.hotel, 'host', None) if is_hotel_booking else getattr(booking.bnb_listing, 'host', None)
    if not host:
        return

    stay_name = booking.hotel.name if is_hotel_booking else (booking.bnb_listing.title if booking.bnb_listing_id else 'your property')
    title = 'New hotel booking request' if is_hotel_booking else 'New BnB booking request'
    message = (
        f'{booking.guest_full_name} requested to book {stay_name} '
        f'from {booking.check_in} to {booking.check_out}. Please confirm availability.'
    )

    Notification.objects.create(
        user=host,
        title=title,
        message=message,
        notification_type=Notification.Type.INFO,
        data={
            'booking_id': booking.id,
            'hotel_id': booking.hotel_id,
            'bnb_listing_id': booking.bnb_listing_id,
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


def notify_guest_about_host_decision(booking: Booking, *, approved: bool):
    is_hotel_booking = bool(booking.hotel_id)
    stay_name = booking.hotel.name if is_hotel_booking else (booking.bnb_listing.title if booking.bnb_listing_id else 'your stay')

    if approved:
        title = 'Reservation approved — choose how to pay'
        message = (
            f'Good news! {stay_name} is available for your dates. '
            f'Choose to pay now or pay at check-in to secure your reservation.'
        )
        notification_type = Notification.Type.SUCCESS
    else:
        title = 'Reservation not available'
        message = (
            f'Unfortunately {stay_name} is not available for your selected dates. '
            f'Please continue your search for another option.'
        )
        notification_type = Notification.Type.WARNING

    Notification.objects.create(
        user=booking.traveler,
        title=title,
        message=message,
        notification_type=notification_type,
        data={
            'booking_id': booking.id,
            'hotel_id': booking.hotel_id,
            'bnb_listing_id': booking.bnb_listing_id,
        },
    )

    if booking.traveler.email:
        try:
            send_mail(
                title,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [booking.traveler.email],
                fail_silently=True,
            )
        except Exception:
            logger.exception(
                "Booking decision email failed",
                extra={"booking_id": booking.id, "traveler_id": booking.traveler_id},
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
        if booking.hotel_id or booking.bnb_listing_id:
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

    if booking.status == Booking.BookingStatus.PENDING:
        # The booking hasn't been approved yet, so this action is the host's
        # yes/no answer to "is this room/listing actually available?" rather
        # than a direct status change. `status` only moves to CONFIRMED once
        # the guest has actually paid (or confirmed pay-at-premises).
        if new_status == Booking.BookingStatus.CONFIRMED:
            booking.host_approval_status = Booking.HostApprovalStatus.APPROVED
            booking.save(update_fields=['host_approval_status', 'updated_at'])
            notify_guest_about_host_decision(booking, approved=True)
        elif new_status == Booking.BookingStatus.CANCELLED:
            booking.host_approval_status = Booking.HostApprovalStatus.DECLINED
            booking.status = Booking.BookingStatus.CANCELLED
            booking.save(update_fields=['host_approval_status', 'status', 'updated_at'])
            notify_guest_about_host_decision(booking, approved=False)
        else:
            return Response(
                {'detail': 'A pending booking must be approved or declined before it can be completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        # Booking was already approved and finalized (confirmed/completed);
        # this is the host managing its lifecycle after the fact.
        booking.status = new_status
        booking.save(update_fields=['status', 'updated_at'])
        if new_status == Booking.BookingStatus.CANCELLED:
            notify_guest_about_host_decision(booking, approved=False)

    serializer = BookingDetailSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_pay_at_premises(request, pk):
    """
    Guest-facing action: finalize a host-approved booking as pay-at-premises,
    without going through the online payment flow.
    """
    try:
        booking = Booking.objects.select_related('hotel', 'bnb_listing').get(pk=pk, traveler=request.user)
    except Booking.DoesNotExist:
        return Response({'detail': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

    if booking.host_approval_status != Booking.HostApprovalStatus.APPROVED:
        return Response(
            {'detail': 'This booking is still awaiting host confirmation.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if booking.status != Booking.BookingStatus.PENDING:
        return Response({'detail': 'This booking has already been finalized.'}, status=status.HTTP_400_BAD_REQUEST)

    booking.payment_method = Booking.PaymentMethod.PAY_AT_PREMISES
    booking.status = Booking.BookingStatus.CONFIRMED
    booking.save(update_fields=['payment_method', 'status', 'updated_at'])

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
