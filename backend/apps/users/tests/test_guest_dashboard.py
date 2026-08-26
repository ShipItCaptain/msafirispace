from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBFavorite, BnBListing, Favorite, Hotel, RoomType
from apps.payments.models import Payment
from apps.reviews.models import Review


@pytest.mark.django_db
def test_user_stats_and_dashboard_return_real_guest_data():
    User = get_user_model()
    guest = User.objects.create_user(
        username='guest_dashboard_user',
        email='guest_dashboard@example.com',
        password='testpass123',
    )
    host = User.objects.create_user(
        username='guest_dashboard_host',
        email='guest_dashboard_host@example.com',
        password='testpass123',
        user_type=User.UserType.HOST,
        host_type=User.HostType.HOTEL_RESTAURANT_HOST,
    )

    hotel = Hotel.objects.create(
        host=host,
        name='Dashboard Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Main Street',
        city='Nairobi',
        country='Kenya',
        is_verified=True,
    )
    room = RoomType.objects.create(
        hotel=hotel,
        name='Standard Room',
        category='standard',
        description='room',
        short_description='room',
        base_price=Decimal('2500.00'),
        max_occupancy=2,
        max_adults=2,
        max_children=0,
    )
    bnb = BnBListing.objects.create(
        host=host,
        title='Dashboard BnB',
        description='bnb',
        city='Nairobi',
        country='Kenya',
        price_per_night=Decimal('3200.00'),
    )

    upcoming_booking = Booking.objects.create(
        traveler=guest,
        bnb_listing=bnb,
        check_in=date.today() + timedelta(days=5),
        check_out=date.today() + timedelta(days=7),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('3200.00'),
        currency='KES',
        total_nights=2,
        total_amount=Decimal('6400.00'),
        guest_full_name='Guest One',
        guest_email=guest.email,
        guest_phone='',
        status=Booking.BookingStatus.PENDING,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.UNPAID,
    )
    Booking.objects.create(
        traveler=guest,
        hotel=hotel,
        room_type=room,
        check_in=date.today() - timedelta(days=10),
        check_out=date.today() - timedelta(days=8),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('2500.00'),
        currency='KES',
        total_nights=2,
        total_amount=Decimal('5000.00'),
        guest_full_name='Guest One',
        guest_email=guest.email,
        guest_phone='',
        status=Booking.BookingStatus.COMPLETED,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )

    Payment.objects.create(
        booking=upcoming_booking,
        traveler=guest,
        gateway=Payment.Gateway.MPESA,
        amount=Decimal('1600.00'),
        currency='KES',
        status=Payment.Status.SUCCESS,
        reference='PAY_TEST_001',
        provider_reference='PROVIDER_TEST_001',
    )

    Review.objects.create(
        traveler=guest,
        bnb_listing=bnb,
        rating=4,
        title='Nice stay',
        comment='Good experience',
        is_public=True,
    )

    Favorite.objects.create(user=guest, hotel=hotel)
    BnBFavorite.objects.create(user=guest, bnb_listing=bnb)

    client = APIClient()
    client.force_authenticate(user=guest)

    stats_response = client.get('/api/v1/auth/stats/')
    assert stats_response.status_code == 200
    stats_data = stats_response.json()
    assert stats_data['total_bookings'] == 2
    assert stats_data['total_reviews'] == 1
    assert float(stats_data['total_spent']) == 1600.0
    assert 'Nairobi, Kenya' in stats_data['favorite_destinations']

    dashboard_response = client.get('/api/v1/auth/dashboard/')
    assert dashboard_response.status_code == 200
    dashboard_data = dashboard_response.json()
    assert dashboard_data['quick_stats']['total_bookings'] == 2
    assert dashboard_data['quick_stats']['pending_bookings'] == 1
    assert float(dashboard_data['quick_stats']['pending_bookings_amount']) == 6400.0
    assert len(dashboard_data['favorites']) == 2
    assert len(dashboard_data['recent_activity']) >= 1
    assert len(dashboard_data['upcoming_trips']) == 1
