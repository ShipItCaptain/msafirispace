from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBAvailability, BnBListing


def _create_user(email, username):
    User = get_user_model()
    return User.objects.create_user(
        email=email,
        username=username,
        password='testpass123',
        first_name='Test',
        last_name='User',
    )


def _create_bnb(host, **overrides):
    data = {
        'host': host,
        'title': 'Cozy BnB',
        'city': 'Nairobi',
        'country': 'Kenya',
        'address': 'Nairobi West',
        'price_per_night': Decimal('2500.00'),
        'currency': 'KES',
        'max_guests': 3,
        'minimum_nights': 1,
        'maximum_nights': 7,
        'is_active': True,
    }
    data.update(overrides)
    return BnBListing.objects.create(**data)


@pytest.mark.django_db
def test_create_bnb_booking_success():
    host = _create_user('host@example.com', 'host_user')
    traveler = _create_user('guest@example.com', 'guest_user')
    listing = _create_bnb(host)
    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=3)
    check_out = check_in + timedelta(days=2)
    payload = {
        'bnb_listing_id': listing.id,
        'check_in': check_in.isoformat(),
        'check_out': check_out.isoformat(),
        'num_adults': 2,
        'num_children': 0,
        'guest_full_name': 'Guest User',
        'guest_email': traveler.email,
        'guest_phone': '+254700000000',
        'payment_method': 'online',
    }

    response = client.post('/api/v1/bookings/', payload, format='json')
    assert response.status_code == 201, response.data
    assert response.data['bnb_listing']['id'] == listing.id
    assert response.data['total_nights'] == 2
    assert Decimal(str(response.data['total_amount'])) == Decimal('5000.00')


@pytest.mark.django_db
def test_create_bnb_booking_rejects_overlapping_dates():
    host = _create_user('host2@example.com', 'host_user_2')
    traveler1 = _create_user('guest2@example.com', 'guest_user_2')
    traveler2 = _create_user('guest3@example.com', 'guest_user_3')
    listing = _create_bnb(host)
    check_in = date.today() + timedelta(days=5)
    check_out = check_in + timedelta(days=3)

    Booking.objects.create(
        traveler=traveler1,
        bnb_listing=listing,
        check_in=check_in,
        check_out=check_out,
        num_adults=1,
        num_children=0,
        nightly_price=listing.price_per_night,
        currency=listing.currency,
        total_nights=3,
        total_amount=Decimal('7500.00'),
        guest_full_name='First Guest',
        guest_email=traveler1.email,
        guest_phone='',
    )

    client = APIClient()
    client.force_authenticate(user=traveler2)
    payload = {
        'bnb_listing_id': listing.id,
        'check_in': (check_in + timedelta(days=1)).isoformat(),
        'check_out': (check_out + timedelta(days=1)).isoformat(),
        'num_adults': 2,
        'num_children': 0,
        'guest_full_name': 'Second Guest',
        'guest_email': traveler2.email,
        'guest_phone': '+254700000111',
    }

    response = client.post('/api/v1/bookings/', payload, format='json')
    assert response.status_code == 400
    assert 'check_in' in response.data


@pytest.mark.django_db
def test_create_bnb_booking_enforces_guest_and_night_limits():
    host = _create_user('host4@example.com', 'host_user_4')
    traveler = _create_user('guest4@example.com', 'guest_user_4')
    listing = _create_bnb(host, max_guests=2, minimum_nights=2, maximum_nights=4)
    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=7)
    one_night_response = client.post(
        '/api/v1/bookings/',
        {
            'bnb_listing_id': listing.id,
            'check_in': check_in.isoformat(),
            'check_out': (check_in + timedelta(days=1)).isoformat(),
            'num_adults': 2,
            'num_children': 0,
            'guest_full_name': 'Guest User',
            'guest_email': traveler.email,
            'guest_phone': '+254700000222',
        },
        format='json',
    )
    assert one_night_response.status_code == 400
    assert 'check_out' in one_night_response.data

    too_many_guests_response = client.post(
        '/api/v1/bookings/',
        {
            'bnb_listing_id': listing.id,
            'check_in': check_in.isoformat(),
            'check_out': (check_in + timedelta(days=2)).isoformat(),
            'num_adults': 3,
            'num_children': 0,
            'guest_full_name': 'Guest User',
            'guest_email': traveler.email,
            'guest_phone': '+254700000222',
        },
        format='json',
    )
    assert too_many_guests_response.status_code == 400
    assert 'num_adults' in too_many_guests_response.data


@pytest.mark.django_db
def test_create_bnb_booking_rejects_blocked_availability_dates():
    host = _create_user('host5@example.com', 'host_user_5')
    traveler = _create_user('guest5@example.com', 'guest_user_5')
    listing = _create_bnb(host)
    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=10)
    blocked_date = check_in + timedelta(days=1)
    BnBAvailability.objects.create(
        bnb_listing=listing,
        date=blocked_date,
        status=BnBAvailability.AvailabilityStatus.BLOCKED,
    )

    response = client.post(
        '/api/v1/bookings/',
        {
            'bnb_listing_id': listing.id,
            'check_in': check_in.isoformat(),
            'check_out': (check_in + timedelta(days=3)).isoformat(),
            'num_adults': 2,
            'num_children': 0,
            'guest_full_name': 'Guest User',
            'guest_email': traveler.email,
            'guest_phone': '+254700000333',
        },
        format='json',
    )
    assert response.status_code == 400
    assert 'check_in' in response.data
