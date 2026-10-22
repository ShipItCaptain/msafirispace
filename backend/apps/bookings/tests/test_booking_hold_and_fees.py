from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBAvailability, BnBListing


def _create_user(email, username):
    User = get_user_model()
    return User.objects.create_user(
        email=email, username=username, password='testpass123',
        first_name='Test', last_name='User',
    )


def _create_bnb(host, **overrides):
    data = {
        'host': host,
        'title': 'Cozy BnB',
        'city': 'Nairobi',
        'country': 'Kenya',
        'address': 'Nairobi West',
        'price_per_night': Decimal('5000.00'),
        'cleaning_fee': Decimal('1500.00'),
        'security_deposit': Decimal('3000.00'),
        'currency': 'KES',
        'max_guests': 3,
        'minimum_nights': 1,
        'maximum_nights': 7,
        'is_active': True,
    }
    data.update(overrides)
    return BnBListing.objects.create(**data)


def _book(client, listing, check_in, check_out, guest_email):
    return client.post('/api/v1/bookings/', {
        'bnb_listing_id': listing.id,
        'check_in': check_in.isoformat(),
        'check_out': check_out.isoformat(),
        'num_adults': 1,
        'guest_full_name': 'Guest',
        'guest_email': guest_email,
    }, format='json')


@pytest.mark.django_db
def test_booking_total_includes_cleaning_fee_and_shows_deposit_separately():
    host = _create_user('host1@example.com', 'host1')
    traveler = _create_user('guest1@example.com', 'guest1')
    listing = _create_bnb(host)
    client = APIClient()
    client.force_authenticate(user=traveler)

    check_in = date.today() + timedelta(days=3)
    check_out = check_in + timedelta(days=3)  # 3 nights
    response = _book(client, listing, check_in, check_out, traveler.email)

    assert response.status_code == 201, response.data
    assert Decimal(response.data['cleaning_fee']) == Decimal('1500.00')
    assert Decimal(response.data['total_amount']) == Decimal('5000.00') * 3 + Decimal('1500.00')
    assert Decimal(response.data['deposit_amount']) == Decimal('3000.00')


@pytest.mark.django_db
def test_unverified_calendar_gets_long_hold_and_blocks_then_releases():
    host = _create_user('host2@example.com', 'host2')
    guest1 = _create_user('guest2@example.com', 'guest2')
    guest2 = _create_user('guest3@example.com', 'guest3')
    listing = _create_bnb(host)
    # No BnBAvailability rows at all for these dates -- unverified calendar.

    client1 = APIClient()
    client1.force_authenticate(user=guest1)
    check_in = date.today() + timedelta(days=10)
    check_out = check_in + timedelta(days=2)
    first = _book(client1, listing, check_in, check_out, guest1.email)
    assert first.status_code == 201, first.data
    assert first.data['calendar_verified'] is False

    booking = Booking.objects.get(pk=first.data['id'])
    expected_sla = timezone.now() + timedelta(hours=2)
    assert abs((booking.hold_expires_at - expected_sla).total_seconds()) < 30

    # A second guest is blocked while the hold is live.
    client2 = APIClient()
    client2.force_authenticate(user=guest2)
    second = _book(client2, listing, check_in, check_out, guest2.email)
    assert second.status_code == 400

    # Once the hold lapses, the dates are free again.
    booking.hold_expires_at = timezone.now() - timedelta(minutes=1)
    booking.save(update_fields=['hold_expires_at'])
    assert booking.is_hold_expired is True

    third = _book(client2, listing, check_in, check_out, guest2.email)
    assert third.status_code == 201, third.data


@pytest.mark.django_db
def test_verified_calendar_gets_short_hold():
    host = _create_user('host3@example.com', 'host3')
    traveler = _create_user('guest4@example.com', 'guest4')
    listing = _create_bnb(host)
    check_in = date.today() + timedelta(days=20)
    check_out = check_in + timedelta(days=2)
    for offset in range(2):
        BnBAvailability.objects.create(
            bnb_listing=listing, date=check_in + timedelta(days=offset),
            status=BnBAvailability.AvailabilityStatus.AVAILABLE,
        )

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = _book(client, listing, check_in, check_out, traveler.email)

    assert response.status_code == 201, response.data
    assert response.data['calendar_verified'] is True
    booking = Booking.objects.get(pk=response.data['id'])
    expected_hold = timezone.now() + timedelta(minutes=30)
    assert abs((booking.hold_expires_at - expected_hold).total_seconds()) < 30


@pytest.mark.django_db
def test_host_approval_clears_the_hold():
    host = _create_user('host4@example.com', 'host4')
    traveler = _create_user('guest5@example.com', 'guest5')
    listing = _create_bnb(host)
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=1)

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = _book(client, listing, check_in, check_out, traveler.email)
    booking_id = response.data['id']

    host_client = APIClient()
    host_client.force_authenticate(user=host)
    approve = host_client.post(f'/api/v1/bookings/{booking_id}/host-status/', {'status': 'confirmed'}, format='json')
    assert approve.status_code == 200, approve.data

    booking = Booking.objects.get(pk=booking_id)
    assert booking.hold_expires_at is None
    assert booking.is_hold_expired is False
