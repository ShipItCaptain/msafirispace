from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBListing


def _create_pending_booking(host_approval_status):
    User = get_user_model()
    host = User.objects.create_user(
        username='intent_gate_host',
        email='intent_gate_host@example.com',
        password='testpass123',
    )
    traveler = User.objects.create_user(
        username='intent_gate_guest',
        email='intent_gate_guest@example.com',
        password='testpass123',
    )
    bnb = BnBListing.objects.create(
        host=host,
        title='Intent Gate BnB',
        description='bnb',
        city='Wote',
        country='Kenya',
        price_per_night=Decimal('2000.00'),
    )
    booking = Booking.objects.create(
        traveler=traveler,
        bnb_listing=bnb,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=3),
        num_adults=1,
        num_children=0,
        nightly_price=Decimal('2000.00'),
        currency='KES',
        total_nights=2,
        total_amount=Decimal('4000.00'),
        guest_full_name='Traveler',
        guest_email=traveler.email,
        guest_phone='',
        status=Booking.BookingStatus.PENDING,
        payment_method=Booking.PaymentMethod.PAY_AT_PREMISES,
        payment_status=Booking.PaymentStatus.UNPAID,
        host_approval_status=host_approval_status,
    )
    return traveler, booking


@pytest.mark.django_db
def test_payment_intent_creation_blocked_before_host_approval():
    traveler, booking = _create_pending_booking(Booking.HostApprovalStatus.PENDING)

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post(
        '/api/v1/payments/intents/',
        {
            'booking_id': booking.id,
            'gateway': 'mpesa',
            'amount': str(booking.total_amount),
            'mpesa_phone': '+254700000000',
        },
        format='json',
    )
    assert response.status_code == 400
    assert 'booking_id' in response.data


@pytest.mark.django_db
def test_payment_intent_creation_allowed_after_host_approval():
    traveler, booking = _create_pending_booking(Booking.HostApprovalStatus.APPROVED)

    client = APIClient()
    client.force_authenticate(user=traveler)
    response = client.post(
        '/api/v1/payments/intents/',
        {
            'booking_id': booking.id,
            'gateway': 'mpesa',
            'amount': str(booking.total_amount),
            'mpesa_phone': '+254700000000',
        },
        format='json',
    )
    assert response.status_code == 201, response.data
