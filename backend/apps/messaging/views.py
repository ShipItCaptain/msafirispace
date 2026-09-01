import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.bookings.models import Booking
from apps.notifications.models import Notification
from .models import Message
from .serializers import MessageSerializer

logger = logging.getLogger(__name__)


def _booking_host(booking: Booking):
    return booking.hotel.host if booking.hotel_id else booking.bnb_listing.host


def _stay_name(booking: Booking):
    if booking.hotel_id:
        return booking.hotel.name
    if booking.bnb_listing_id:
        return booking.bnb_listing.title
    return 'your stay'


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking(self):
        booking_id = self.kwargs['booking_id']
        try:
            booking = Booking.objects.select_related('hotel__host', 'bnb_listing__host', 'traveler').get(pk=booking_id)
        except Booking.DoesNotExist:
            raise NotFound('Booking not found.')

        host = _booking_host(booking)
        if self.request.user.id not in (booking.traveler_id, getattr(host, 'id', None)):
            raise PermissionDenied("You can only message about your own bookings.")
        return booking

    def get_queryset(self):
        booking = self._get_booking()
        queryset = Message.objects.filter(booking=booking).select_related('sender')

        # Mark the other party's messages as read now that this user has
        # opened the thread.
        Message.objects.filter(
            booking=booking, read_at__isnull=True
        ).exclude(sender=self.request.user).update(read_at=timezone.now())

        return queryset

    def perform_create(self, serializer):
        booking = self._get_booking()
        message = serializer.save(booking=booking, sender=self.request.user)

        host = _booking_host(booking)
        recipient = booking.traveler if self.request.user.id == getattr(host, 'id', None) else host
        if not recipient:
            return

        stay_name = _stay_name(booking)
        title = f'New message about {stay_name}'
        preview = message.body if len(message.body) <= 140 else f'{message.body[:137]}...'

        Notification.objects.create(
            user=recipient,
            title=title,
            message=preview,
            notification_type=Notification.Type.INFO,
            data={
                'booking_id': booking.id,
                'hotel_id': booking.hotel_id,
                'bnb_listing_id': booking.bnb_listing_id,
            },
        )

        if recipient.email:
            try:
                send_mail(
                    title,
                    preview,
                    settings.DEFAULT_FROM_EMAIL,
                    [recipient.email],
                    fail_silently=True,
                )
            except Exception:
                logger.exception(
                    "Message notification email failed",
                    extra={"booking_id": booking.id, "recipient_id": recipient.id},
                )
