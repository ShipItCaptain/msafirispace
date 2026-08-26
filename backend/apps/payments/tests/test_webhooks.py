import hashlib
import hmac
import json
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from apps.bookings.models import Booking
from apps.listings.models import BnBListing
from apps.payments.models import Payment, PaymentIntent


def _create_booking_with_intent(*, gateway=PaymentIntent.Gateway.MPESA, status=PaymentIntent.Status.AUTHORIZING):
    User = get_user_model()
    host = User.objects.create_user(
        username='payments_host',
        email='payments_host@example.com',
        password='testpass123',
        user_type=User.UserType.HOST,
        host_type=User.HostType.BNB_HOST,
    )
    traveler = User.objects.create_user(
        username='payments_guest',
        email='payments_guest@example.com',
        password='testpass123',
    )
    bnb = BnBListing.objects.create(
        host=host,
        title='Payments Test BnB',
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
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PENDING,
    )
    intent = PaymentIntent.objects.create(
        booking=booking,
        traveler=traveler,
        gateway=gateway,
        amount=Decimal('4000.00'),
        currency='KES',
        status=status,
        reference='INTENT_TEST_001',
        client_secret='MPESA_CHECKOUT_001',
    )
    return booking, intent


@pytest.mark.django_db
def test_mpesa_webhook_matches_intent_by_checkout_request_id():
    booking, intent = _create_booking_with_intent(gateway=PaymentIntent.Gateway.MPESA)

    payload = {
        'Body': {
            'stkCallback': {
                'ResultCode': 0,
                'CheckoutRequestID': intent.client_secret,
                'CallbackMetadata': {'Item': []},
            }
        }
    }

    client = APIClient()
    response = client.post(
        '/api/v1/payments/webhooks/mpesa/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 200
    intent.refresh_from_db()
    booking.refresh_from_db()
    assert intent.status == PaymentIntent.Status.COMPLETED
    assert booking.payment_status == Booking.PaymentStatus.PAID
    assert booking.status == Booking.BookingStatus.CONFIRMED
    assert Payment.objects.filter(provider_reference=intent.client_secret, status=Payment.Status.SUCCESS).exists()


@pytest.mark.django_db
@override_settings(PAYSTACK_SECRET_KEY='paystack_secret_for_tests', DEBUG=False)
def test_paystack_webhook_requires_valid_signature():
    booking, intent = _create_booking_with_intent(gateway=PaymentIntent.Gateway.PAYSTACK)
    payload = {
        'event': 'charge.success',
        'data': {
            'reference': intent.reference,
            'status': 'success',
        },
    }
    payload_bytes = json.dumps(payload).encode('utf-8')

    client = APIClient()
    invalid_response = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
        HTTP_X_PAYSTACK_SIGNATURE='invalid-signature',
    )
    assert invalid_response.status_code == 400

    signature = hmac.new(
        key='paystack_secret_for_tests'.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha512,
    ).hexdigest()
    valid_response = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
        HTTP_X_PAYSTACK_SIGNATURE=signature,
    )
    assert valid_response.status_code == 200

    intent.refresh_from_db()
    booking.refresh_from_db()
    assert intent.status == PaymentIntent.Status.COMPLETED
    assert booking.payment_status == Booking.PaymentStatus.PAID
    assert booking.status == Booking.BookingStatus.CONFIRMED


@pytest.mark.django_db
@override_settings(PAYSTACK_SECRET_KEY='', DEBUG=True, WEBHOOK_TEST_TOKEN='local-webhook-token')
def test_paystack_webhook_requires_debug_test_token_when_secret_missing():
    booking, intent = _create_booking_with_intent(gateway=PaymentIntent.Gateway.PAYSTACK)
    payload = {
        'event': 'charge.success',
        'data': {
            'reference': intent.reference,
            'status': 'success',
            'id': 123456,
        },
    }
    payload_bytes = json.dumps(payload).encode('utf-8')

    client = APIClient()
    denied_response = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
    )
    assert denied_response.status_code == 400

    allowed_response = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
        HTTP_X_MSAFIRI_WEBHOOK_TOKEN='local-webhook-token',
    )
    assert allowed_response.status_code == 200

    booking.refresh_from_db()
    assert booking.payment_status == Booking.PaymentStatus.PAID
    assert Payment.objects.filter(provider_reference='123456').count() == 1


@pytest.mark.django_db
@override_settings(PAYSTACK_SECRET_KEY='paystack_secret_for_tests', DEBUG=False)
def test_paystack_webhook_is_idempotent_for_duplicate_callbacks():
    booking, intent = _create_booking_with_intent(gateway=PaymentIntent.Gateway.PAYSTACK)
    payload = {
        'event': 'charge.success',
        'data': {
            'reference': intent.reference,
            'status': 'success',
            'id': 987654,
        },
    }
    payload_bytes = json.dumps(payload).encode('utf-8')
    signature = hmac.new(
        key='paystack_secret_for_tests'.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha512,
    ).hexdigest()

    client = APIClient()
    first = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
        HTTP_X_PAYSTACK_SIGNATURE=signature,
    )
    second = client.post(
        '/api/v1/payments/webhooks/paystack/',
        data=payload_bytes,
        content_type='application/json',
        HTTP_X_PAYSTACK_SIGNATURE=signature,
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json().get('duplicate') is True
    assert Payment.objects.filter(provider_reference='987654').count() == 1
