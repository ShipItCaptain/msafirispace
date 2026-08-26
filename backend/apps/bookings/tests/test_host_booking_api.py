from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBListing, Hotel, RoomAvailability, RoomType
from apps.notifications.models import Notification


@pytest.fixture
def user_model():
    return get_user_model()


def _create_user(user_model, username, email):
    return user_model.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        first_name='Test',
        last_name='User',
    )


def _create_hotel_with_room(host):
    hotel = Hotel.objects.create(
        host=host,
        name='Host Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
    )
    room = RoomType.objects.create(
        hotel=hotel,
        name='Standard Room',
        category='standard',
        base_price=Decimal('4500.00'),
        max_occupancy=2,
        max_adults=2,
        max_children=0,
    )
    return hotel, room


def _create_bnb(host):
    return BnBListing.objects.create(
        host=host,
        title='Host BnB',
        city='Nairobi',
        country='Kenya',
        address='Nairobi',
        price_per_night=Decimal('3000.00'),
        max_guests=2,
        minimum_nights=1,
        maximum_nights=10,
    )


@pytest.mark.django_db
def test_host_bookings_list_includes_hotel_and_bnb_bookings(user_model):
    host = _create_user(user_model, 'host_dash', 'hostdash@example.com')
    traveler = _create_user(user_model, 'trav_dash', 'travdash@example.com')
    hotel, room = _create_hotel_with_room(host)
    bnb = _create_bnb(host)

    check_in = date.today() + timedelta(days=2)
    check_out = check_in + timedelta(days=2)

    Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=check_in,
        check_out=check_out,
        num_adults=1,
        num_children=0,
        nightly_price=room.base_price,
        currency='KES',
        total_nights=2,
        total_amount=Decimal('9000.00'),
        guest_full_name='Traveler One',
        guest_email=traveler.email,
        guest_phone='+254700000000',
        status=Booking.BookingStatus.PENDING,
    )

    Booking.objects.create(
        traveler=traveler,
        bnb_listing=bnb,
        check_in=check_in,
        check_out=check_out,
        num_adults=1,
        num_children=0,
        nightly_price=bnb.price_per_night,
        currency='KES',
        total_nights=2,
        total_amount=Decimal('6000.00'),
        guest_full_name='Traveler One',
        guest_email=traveler.email,
        guest_phone='+254700000000',
        status=Booking.BookingStatus.CONFIRMED,
    )

    client = APIClient()
    client.force_authenticate(user=host)

    response = client.get('/api/v1/bookings/host/')
    assert response.status_code == 200
    payload = response.json()
    results = payload.get('results', payload)
    assert len(results) == 2
    booking_types = {item['booking_type'] for item in results}
    assert booking_types == {'hotel', 'bnb'}


@pytest.mark.django_db
def test_host_can_update_owned_booking_status(user_model):
    host = _create_user(user_model, 'host_update', 'hostupdate@example.com')
    traveler = _create_user(user_model, 'trav_update', 'travupdate@example.com')
    hotel, room = _create_hotel_with_room(host)

    booking = Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=date.today() + timedelta(days=3),
        check_out=date.today() + timedelta(days=4),
        num_adults=1,
        num_children=0,
        nightly_price=room.base_price,
        currency='KES',
        total_nights=1,
        total_amount=room.base_price,
        guest_full_name='Traveler Two',
        guest_email=traveler.email,
        guest_phone='+254711111111',
        status=Booking.BookingStatus.PENDING,
    )

    client = APIClient()
    client.force_authenticate(user=host)

    response = client.post(
        f'/api/v1/bookings/{booking.id}/host-status/',
        {'status': 'confirmed'},
        format='json',
    )
    assert response.status_code == 200
    booking.refresh_from_db()
    assert booking.status == Booking.BookingStatus.CONFIRMED


@pytest.mark.django_db
def test_host_cannot_update_unowned_booking_status(user_model):
    owner = _create_user(user_model, 'owner_host', 'owner@example.com')
    other_host = _create_user(user_model, 'other_host', 'other@example.com')
    traveler = _create_user(user_model, 'trav_noauth', 'travnoauth@example.com')
    hotel, room = _create_hotel_with_room(owner)

    booking = Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=date.today() + timedelta(days=5),
        check_out=date.today() + timedelta(days=7),
        num_adults=1,
        num_children=0,
        nightly_price=room.base_price,
        currency='KES',
        total_nights=2,
        total_amount=Decimal('9000.00'),
        guest_full_name='Traveler Three',
        guest_email=traveler.email,
        guest_phone='+254722222222',
        status=Booking.BookingStatus.PENDING,
    )

    client = APIClient()
    client.force_authenticate(user=other_host)
    response = client.post(
        f'/api/v1/bookings/{booking.id}/host-status/',
        {'status': 'confirmed'},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_hotel_booking_creates_host_notification_and_pending_payment_status(user_model):
    host = _create_user(user_model, 'host_notify', 'hostnotify@example.com')
    traveler = _create_user(user_model, 'trav_notify', 'travnotify@example.com')
    hotel, room = _create_hotel_with_room(host)

    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=4)
    check_out = check_in + timedelta(days=2)
    response = client.post(
        '/api/v1/bookings/',
        {
            'room_type_id': room.id,
            'check_in': check_in.isoformat(),
            'check_out': check_out.isoformat(),
            'num_adults': 1,
            'num_children': 0,
            'guest_full_name': 'Traveler Notify',
            'guest_email': traveler.email,
            'guest_phone': '+254733333333',
            'payment_method': 'online',
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    booking = Booking.objects.get(pk=response.data['id'])
    assert booking.status == Booking.BookingStatus.PENDING
    assert booking.payment_status == Booking.PaymentStatus.PENDING

    notification = Notification.objects.get(user=host, data__booking_id=booking.id)
    assert notification.title == 'New hotel booking request'
    assert notification.data['channel_status']['in_app'] == 'sent'
    assert notification.data['channel_status']['whatsapp'] == 'pending'


@pytest.mark.django_db
def test_hotel_booking_pay_at_hotel_stays_unpaid_and_pending(user_model):
    host = _create_user(user_model, 'host_pay_hotel', 'hostpayhotel@example.com')
    traveler = _create_user(user_model, 'trav_pay_hotel', 'travpayhotel@example.com')
    hotel, room = _create_hotel_with_room(host)

    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=6)
    check_out = check_in + timedelta(days=1)
    response = client.post(
        '/api/v1/bookings/',
        {
            'room_type_id': room.id,
            'check_in': check_in.isoformat(),
            'check_out': check_out.isoformat(),
            'num_adults': 1,
            'num_children': 0,
            'guest_full_name': 'Traveler Pay At Hotel',
            'guest_email': traveler.email,
            'guest_phone': '+254744444444',
            'payment_method': 'pay_at_premises',
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    booking = Booking.objects.get(pk=response.data['id'])
    assert booking.status == Booking.BookingStatus.PENDING
    assert booking.payment_status == Booking.PaymentStatus.UNPAID


@pytest.mark.django_db
def test_hotel_booking_rejects_dates_with_no_vacancy(user_model):
    host = _create_user(user_model, 'host_full', 'hostfull@example.com')
    traveler = _create_user(user_model, 'trav_full', 'travfull@example.com')
    hotel, room = _create_hotel_with_room(host)

    check_in = date.today() + timedelta(days=8)
    check_out = check_in + timedelta(days=2)

    RoomAvailability.objects.create(
        room_type=room,
        date=check_in,
        status=RoomAvailability.AvailabilityStatus.AVAILABLE,
        available_rooms=1,
        total_rooms=1,
    )
    RoomAvailability.objects.create(
        room_type=room,
        date=check_in + timedelta(days=1),
        status=RoomAvailability.AvailabilityStatus.AVAILABLE,
        available_rooms=1,
        total_rooms=1,
    )

    Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=check_in,
        check_out=check_out,
        num_adults=1,
        num_children=0,
        nightly_price=room.base_price,
        currency='KES',
        total_nights=2,
        total_amount=Decimal('9000.00'),
        guest_full_name='Existing Traveler',
        guest_email=traveler.email,
        guest_phone='+254755555555',
        status=Booking.BookingStatus.PENDING,
        payment_method=Booking.PaymentMethod.PAY_AT_PREMISES,
        payment_status=Booking.PaymentStatus.UNPAID,
    )

    another_traveler = _create_user(user_model, 'trav_blocked', 'travblocked@example.com')
    client = APIClient()
    client.force_authenticate(user=another_traveler)
    response = client.post(
        '/api/v1/bookings/',
        {
            'room_type_id': room.id,
            'check_in': check_in.isoformat(),
            'check_out': check_out.isoformat(),
            'num_adults': 1,
            'num_children': 0,
            'guest_full_name': 'Blocked Traveler',
            'guest_email': another_traveler.email,
            'guest_phone': '+254766666666',
            'payment_method': 'online',
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'check_in' in response.data
