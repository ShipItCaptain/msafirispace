from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBListing
from apps.messaging.models import Message
from apps.notifications.models import Notification


def _create_user(username, email):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username=username, email=email, password='testpass123',
        first_name='Test', last_name='User',
    )


def _create_bnb(host):
    return BnBListing.objects.create(
        host=host, title='Cozy Stay', description='desc', property_type='apartment',
        address='Wote', city='Wote', country='Kenya',
        price_per_night=Decimal('3000.00'), max_guests=2,
    )


def _create_booking(traveler, bnb):
    check_in = timezone.localdate() + timedelta(days=5)
    check_out = check_in + timedelta(days=2)
    return Booking.objects.create(
        traveler=traveler, bnb_listing=bnb, check_in=check_in, check_out=check_out,
        num_adults=1, num_children=0, nightly_price=bnb.price_per_night, currency='KES',
        total_nights=2, total_amount=Decimal('6000.00'),
        guest_full_name='Traveler One', guest_email=traveler.email, guest_phone='+254700000000',
        status=Booking.BookingStatus.CONFIRMED, host_approval_status=Booking.HostApprovalStatus.APPROVED,
    )


@pytest.mark.django_db
def test_guest_and_host_can_exchange_messages():
    host = _create_user('msg_host', 'msg_host@example.com')
    traveler = _create_user('msg_traveler', 'msg_traveler@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(traveler, bnb)

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post(
        f'/api/v1/messaging/bookings/{booking.id}/messages/',
        {'body': 'What time is check-in?'},
        format='json',
    )
    assert response.status_code == 201, response.data
    assert response.data['sender'] == traveler.id

    client.force_authenticate(user=host)
    response = client.get(f'/api/v1/messaging/bookings/{booking.id}/messages/')
    assert response.status_code == 200
    assert len(response.data['results']) == 1
    assert response.data['results'][0]['body'] == 'What time is check-in?'

    reply = client.post(
        f'/api/v1/messaging/bookings/{booking.id}/messages/',
        {'body': 'Check-in is 3pm!'},
        format='json',
    )
    assert reply.status_code == 201

    client.force_authenticate(user=traveler)
    thread = client.get(f'/api/v1/messaging/bookings/{booking.id}/messages/')
    assert [m['body'] for m in thread.data['results']] == ['What time is check-in?', 'Check-in is 3pm!']


@pytest.mark.django_db
def test_stranger_cannot_read_or_send_messages():
    host = _create_user('msg_host2', 'msg_host2@example.com')
    traveler = _create_user('msg_traveler2', 'msg_traveler2@example.com')
    stranger = _create_user('msg_stranger', 'msg_stranger@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(traveler, bnb)

    client = APIClient()
    client.force_authenticate(user=stranger)

    get_response = client.get(f'/api/v1/messaging/bookings/{booking.id}/messages/')
    assert get_response.status_code == 403

    post_response = client.post(
        f'/api/v1/messaging/bookings/{booking.id}/messages/',
        {'body': 'Sneaky message'},
        format='json',
    )
    assert post_response.status_code == 403
    assert not Message.objects.filter(booking=booking).exists()


@pytest.mark.django_db
def test_empty_message_is_rejected():
    host = _create_user('msg_host3', 'msg_host3@example.com')
    traveler = _create_user('msg_traveler3', 'msg_traveler3@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(traveler, bnb)

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post(
        f'/api/v1/messaging/bookings/{booking.id}/messages/',
        {'body': '   '},
        format='json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_sending_a_message_notifies_the_other_party():
    host = _create_user('msg_host4', 'msg_host4@example.com')
    traveler = _create_user('msg_traveler4', 'msg_traveler4@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(traveler, bnb)

    client = APIClient()
    client.force_authenticate(user=traveler)
    client.post(
        f'/api/v1/messaging/bookings/{booking.id}/messages/',
        {'body': 'Hello host'},
        format='json',
    )

    notification = Notification.objects.get(user=host)
    assert notification.data['booking_id'] == booking.id


@pytest.mark.django_db
def test_opening_the_thread_marks_the_other_partys_messages_read():
    host = _create_user('msg_host5', 'msg_host5@example.com')
    traveler = _create_user('msg_traveler5', 'msg_traveler5@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(traveler, bnb)

    client = APIClient()
    client.force_authenticate(user=traveler)
    client.post(f'/api/v1/messaging/bookings/{booking.id}/messages/', {'body': 'Hi'}, format='json')

    message = Message.objects.get(booking=booking)
    assert message.read_at is None

    client.force_authenticate(user=host)
    client.get(f'/api/v1/messaging/bookings/{booking.id}/messages/')

    message.refresh_from_db()
    assert message.read_at is not None
