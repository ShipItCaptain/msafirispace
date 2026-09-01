from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBListing, Hotel
from apps.reviews.models import Review


def _create_user(username, email):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        first_name='Test',
        last_name='User',
    )


def _create_bnb(host):
    return BnBListing.objects.create(
        host=host,
        title='Cozy Stay',
        description='desc',
        property_type='apartment',
        address='Wote',
        city='Wote',
        country='Kenya',
        price_per_night=Decimal('3000.00'),
        max_guests=2,
    )


def _create_booking(traveler, bnb, *, status, check_out):
    check_in = check_out - timedelta(days=2)
    return Booking.objects.create(
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
        status=status,
    )


@pytest.mark.django_db
def test_guest_can_review_a_confirmed_past_booking():
    host = _create_user('review_host', 'review_host@example.com')
    traveler = _create_user('review_traveler', 'review_traveler@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.CONFIRMED,
        check_out=timezone.localdate() - timedelta(days=1),
    )

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 5,
        'title': 'Loved it',
        'comment': 'Great stay, would come back.',
    }, format='json')

    assert response.status_code == 201, response.data
    review = Review.objects.get(booking=booking)
    assert review.traveler == traveler
    assert review.bnb_listing == bnb
    assert review.hotel is None
    assert review.rating == 5


@pytest.mark.django_db
def test_guest_cannot_review_before_checkout_date():
    host = _create_user('review_host2', 'review_host2@example.com')
    traveler = _create_user('review_traveler2', 'review_traveler2@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.CONFIRMED,
        check_out=timezone.localdate() + timedelta(days=3),
    )

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 5,
        'comment': 'Too early',
    }, format='json')

    assert response.status_code == 400
    assert not Review.objects.filter(booking=booking).exists()


@pytest.mark.django_db
def test_guest_cannot_review_a_pending_booking():
    host = _create_user('review_host3', 'review_host3@example.com')
    traveler = _create_user('review_traveler3', 'review_traveler3@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.PENDING,
        check_out=timezone.localdate() - timedelta(days=1),
    )

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 3,
        'comment': 'Still pending',
    }, format='json')

    assert response.status_code == 400
    assert not Review.objects.filter(booking=booking).exists()


@pytest.mark.django_db
def test_guest_cannot_review_someone_elses_booking():
    host = _create_user('review_host4', 'review_host4@example.com')
    traveler = _create_user('review_traveler4', 'review_traveler4@example.com')
    other_traveler = _create_user('review_traveler4b', 'review_traveler4b@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.CONFIRMED,
        check_out=timezone.localdate() - timedelta(days=1),
    )

    client = APIClient()
    client.force_authenticate(user=other_traveler)
    response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 1,
        'comment': 'Not my booking',
    }, format='json')

    assert response.status_code == 400
    assert not Review.objects.filter(booking=booking).exists()


@pytest.mark.django_db
def test_guest_cannot_review_the_same_booking_twice():
    host = _create_user('review_host5', 'review_host5@example.com')
    traveler = _create_user('review_traveler5', 'review_traveler5@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.CONFIRMED,
        check_out=timezone.localdate() - timedelta(days=1),
    )
    Review.objects.create(traveler=traveler, bnb_listing=bnb, booking=booking, rating=4, comment='First review')

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 2,
        'comment': 'Trying again',
    }, format='json')

    assert response.status_code == 400
    assert Review.objects.filter(booking=booking).count() == 1


@pytest.mark.django_db
def test_booking_detail_exposes_review_when_present():
    host = _create_user('review_host6', 'review_host6@example.com')
    traveler = _create_user('review_traveler6', 'review_traveler6@example.com')
    bnb = _create_bnb(host)
    booking = _create_booking(
        traveler, bnb,
        status=Booking.BookingStatus.CONFIRMED,
        check_out=timezone.localdate() - timedelta(days=1),
    )

    client = APIClient()
    client.force_authenticate(user=traveler)

    detail_before = client.get(f'/api/v1/bookings/{booking.id}/')
    assert detail_before.data['review'] is None

    create_response = client.post('/api/v1/reviews/', {
        'booking_id': booking.id,
        'rating': 5,
        'title': 'Amazing',
        'comment': 'Would book again',
    }, format='json')
    assert create_response.status_code == 201

    detail_after = client.get(f'/api/v1/bookings/{booking.id}/')
    assert detail_after.data['review']['rating'] == 5
    assert detail_after.data['review']['title'] == 'Amazing'
