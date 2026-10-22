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
    MultiRoomBookingSerializer,
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


def _booking_host(booking: Booking):
    if booking.hotel_id:
        return getattr(booking.hotel, 'host', None)
    if booking.bnb_listing_id:
        return getattr(booking.bnb_listing, 'host', None)
    return None


def notify_host_about_guest_payment_decision(booking: Booking, *, pay_at_premises: bool):
    """Tell the host when a guest locks in pay-now or pay-at-property after approval."""
    host = _booking_host(booking)
    if not host:
        return
    # Avoid noisy self-notify when someone books their own listing in testing.
    if host.id == booking.traveler_id:
        return

    is_hotel_booking = bool(booking.hotel_id)
    stay_name = (
        booking.hotel.name
        if is_hotel_booking
        else (booking.bnb_listing.title if booking.bnb_listing_id else 'your property')
    )
    guest_name = booking.guest_full_name or booking.traveler.get_full_name() or 'A guest'

    if pay_at_premises:
        title = 'Guest confirmed — paying at the property'
        message = (
            f'{guest_name} confirmed their stay at {stay_name} '
            f'from {booking.check_in} to {booking.check_out}. '
            f'They will pay on arrival.'
        )
        notification_type = Notification.Type.SUCCESS
    else:
        title = 'Guest chose to pay online'
        message = (
            f'{guest_name} selected online payment for {stay_name} '
            f'({booking.check_in} to {booking.check_out}). '
            f'You will be notified once payment clears.'
        )
        notification_type = Notification.Type.INFO

    Notification.objects.create(
        user=host,
        title=title,
        message=message,
        notification_type=notification_type,
        data={
            'booking_id': booking.id,
            'hotel_id': booking.hotel_id,
            'bnb_listing_id': booking.bnb_listing_id,
            'payment_method': (
                Booking.PaymentMethod.PAY_AT_PREMISES
                if pay_at_premises
                else Booking.PaymentMethod.ONLINE
            ),
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
                "Guest payment-decision host email failed",
                extra={"booking_id": booking.id, "host_id": host.id},
            )


class BookingListCreateView(generics.ListCreateAPIView):
    queryset = Booking.objects.select_related(
        'traveler', 'hotel', 'room_type', 'bnb_listing'
    ).prefetch_related('items__room_type')
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_multi_room_booking(request):
    """
    Create one reservation covering multiple room types with quantities
    (e.g. 2x Standard + 1x Family) in a single hotel booking.
    """
    serializer = MultiRoomBookingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        booking = serializer.save(traveler=request.user)
    except ValidationError:
        logger.warning(
            "Multi-room booking creation validation failed",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": getattr(request.user, "id", None),
                "path": request.path,
            },
        )
        raise
    except Exception:
        logger.exception(
            "Multi-room booking creation crashed",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": getattr(request.user, "id", None),
                "path": request.path,
            },
        )
        raise

    notify_host_about_booking(booking)
    response_serializer = BookingDetailSerializer(booking)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Booking.objects.select_related(
        'traveler', 'hotel', 'room_type', 'bnb_listing'
    ).prefetch_related('items__room_type')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        # Traveler OR host of the listing can retrieve (avoids a confusing 404
        # when a host opens /booking/:id from a shared link / old tab).
        # Updates/cancels stay traveler-owned via perform_update / destroy checks.
        user = self.request.user
        return super().get_queryset().filter(
            Q(traveler=user) | Q(hotel__host=user) | Q(bnb_listing__host=user)
        )

    def perform_update(self, serializer):
        if serializer.instance.traveler_id != self.request.user.id:
            raise ValidationError('Only the guest who made this booking can update it.')
        previous_method = serializer.instance.payment_method
        booking = serializer.save()
        new_method = booking.payment_method
        if (
            new_method != previous_method
            and booking.host_approval_status == Booking.HostApprovalStatus.APPROVED
            and booking.status == Booking.BookingStatus.PENDING
        ):
            notify_host_about_guest_payment_decision(
                booking,
                pay_at_premises=(new_method == Booking.PaymentMethod.PAY_AT_PREMISES),
            )

    def perform_destroy(self, instance):
        if instance.traveler_id != self.request.user.id:
            raise ValidationError('Only the guest who made this booking can cancel it.')
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
        ).prefetch_related('items__room_type').filter(traveler=self.request.user)


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
        ).prefetch_related('items__room_type').filter(
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

    serializer = HostBookingListSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def confirm_pay_at_premises(request, pk):
    """
    Guest-facing action: finalize a host-approved booking as pay-at-premises,
    without going through the online payment flow.
    """
    try:
        booking = Booking.objects.select_related(
            'hotel', 'hotel__host', 'bnb_listing', 'bnb_listing__host', 'traveler'
        ).get(pk=pk, traveler=request.user)
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

    notify_host_about_guest_payment_decision(booking, pay_at_premises=True)

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
