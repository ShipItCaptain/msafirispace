from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import Hotel, RoomType
from apps.reviews.models import Review


@pytest.mark.django_db
def test_host_dashboard_summary_returns_aggregates():
    User = get_user_model()
    host = User.objects.create_user(
        username='summary_host',
        email='summary_host@example.com',
        password='testpass123',
        user_type=User.UserType.HOST,
        host_type=User.HostType.BNB_HOST,
        roles=[User.Role.GUEST, User.Role.HOTEL_HOST],
        active_role=User.Role.HOTEL_HOST,
    )
    traveler = User.objects.create_user(
        username='summary_guest',
        email='summary_guest@example.com',
        password='testpass123',
    )

    hotel = Hotel.objects.create(
        host=host,
        name='Summary Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
        is_verified=True,
    )
    room = RoomType.objects.create(
        hotel=hotel,
        name='Summary Room',
        category='standard',
        description='room',
        short_description='room',
        base_price=Decimal('4000.00'),
        max_occupancy=2,
        max_adults=2,
        max_children=0,
    )

    today = date.today()
    Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=today,
        check_out=today + timedelta(days=1),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('4000.00'),
        currency='KES',
        total_nights=1,
        total_amount=Decimal('4000.00'),
        guest_full_name='Guest',
        guest_email=traveler.email,
        guest_phone='',
        status=Booking.BookingStatus.CONFIRMED,
    )

    Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=today + timedelta(days=3),
        check_out=today + timedelta(days=4),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('4000.00'),
        currency='KES',
        total_nights=1,
        total_amount=Decimal('4000.00'),
        guest_full_name='Guest',
        guest_email=traveler.email,
        guest_phone='',
        status=Booking.BookingStatus.PENDING,
    )

    Review.objects.create(
        traveler=traveler,
        hotel=hotel,
        rating=5,
        comment='Great',
        is_public=True,
    )

    client = APIClient()
    client.force_authenticate(user=host)

    response = client.get('/api/v1/auth/host/dashboard/summary/')
    assert response.status_code == 200
    data = response.json()
    assert data['total_bookings'] == 2
    assert data['pending_bookings'] == 1
    assert data['total_revenue'] == 8000.0
    assert data['total_reviews'] == 1
    assert data['average_rating'] == 5.0
    assert data['today_check_ins'] == 1
    assert data['total_rooms'] == 1


@pytest.mark.django_db
def test_host_dashboard_summary_requires_host():
    User = get_user_model()
    traveler = User.objects.create_user(
        username='non_host',
        email='non_host@example.com',
        password='testpass123',
    )

    client = APIClient()
    client.force_authenticate(user=traveler)

    response = client.get('/api/v1/auth/host/dashboard/summary/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_host_dashboard_summary_allows_host_role_without_legacy_user_type():
    """
    A user can hold a host role (via listing creation or "add role") without
    the legacy user_type field ever being set to HOST — that field is only
    touched by the separate host-onboarding flow. The dashboard must key off
    `roles`, the actual source of truth, not user_type.
    """
    User = get_user_model()
    host = User.objects.create_user(
        username='role_only_host',
        email='role_only_host@example.com',
        password='testpass123',
        roles=[User.Role.GUEST, User.Role.HOTEL_HOST],
        active_role=User.Role.GUEST,
    )
    assert host.user_type == User.UserType.TRAVELER
    assert host.is_host is False

    client = APIClient()
    client.force_authenticate(user=host)

    response = client.get('/api/v1/auth/host/dashboard/summary/')
    assert response.status_code == 200


@pytest.mark.django_db
def test_host_dashboard_summary_respects_range_filter():
    User = get_user_model()
    host = User.objects.create_user(
        username='summary_host_range',
        email='summary_host_range@example.com',
        password='testpass123',
        user_type=User.UserType.HOST,
        host_type=User.HostType.BNB_HOST,
        roles=[User.Role.GUEST, User.Role.HOTEL_HOST],
        active_role=User.Role.HOTEL_HOST,
    )
    traveler = User.objects.create_user(
        username='summary_guest_range',
        email='summary_guest_range@example.com',
        password='testpass123',
    )
    hotel = Hotel.objects.create(
        host=host,
        name='Range Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
        is_verified=True,
    )
    room = RoomType.objects.create(
        hotel=hotel,
        name='Range Room',
        category='standard',
        description='room',
        short_description='room',
        base_price=Decimal('4000.00'),
        max_occupancy=2,
        max_adults=2,
        max_children=0,
    )

    recent_booking = Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=date.today(),
        check_out=date.today() + timedelta(days=1),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('4000.00'),
        currency='KES',
        total_nights=1,
        total_amount=Decimal('4000.00'),
        guest_full_name='Guest',
        guest_email=traveler.email,
        guest_phone='',
        status=Booking.BookingStatus.CONFIRMED,
    )
    old_booking = Booking.objects.create(
        traveler=traveler,
        hotel=hotel,
        room_type=room,
        check_in=date.today(),
        check_out=date.today() + timedelta(days=1),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('4000.00'),
        currency='KES',
        total_nights=1,
        total_amount=Decimal('4000.00'),
        guest_full_name='Guest',
        guest_email=traveler.email,
        guest_phone='',
        status=Booking.BookingStatus.CONFIRMED,
    )
    old_date = timezone.now() - timedelta(days=120)
    Booking.objects.filter(pk=old_booking.pk).update(created_at=old_date)
    Booking.objects.filter(pk=recent_booking.pk).update(created_at=timezone.now())

    client = APIClient()
    client.force_authenticate(user=host)

    response = client.get('/api/v1/auth/host/dashboard/summary/?range=30d')
    assert response.status_code == 200
    data = response.json()
    assert data['total_bookings'] == 1
    assert data['total_revenue'] == 4000.0
