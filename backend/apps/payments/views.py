"""
Views for payments app (M-Pesa + Paystack intent and webhook handling).
"""
import json
import hashlib
import hmac
import logging
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q, Sum

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from . import mpesa_client, paystack_client
from .models import Payment, PaymentIntent, PaymentWebhookEvent
from .serializers import (
    PaymentIntentCreateSerializer,
    PaymentIntentSerializer,
    PaymentSerializer,
)

from apps.bookings.models import Booking

logger = logging.getLogger(__name__)


def generate_reference(prefix: str = 'MSF') -> str:
    return f"{prefix}_{get_random_string(10).upper()}"


class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentIntentCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.validated_data['booking']
        gateway = serializer.validated_data['gateway']
        amount = Decimal(serializer.validated_data['amount'])
        is_debug = getattr(settings, 'DEBUG', False)

        if booking.host_approval_status != Booking.HostApprovalStatus.APPROVED:
            raise ValidationError({'booking_id': 'This booking is still awaiting host confirmation.'})

        if booking.payment_method != Booking.PaymentMethod.ONLINE:
            booking.payment_method = Booking.PaymentMethod.ONLINE
        booking.payment_status = Booking.PaymentStatus.PENDING
        # The host-approval hold (if any) is already cleared by the time a
        # booking reaches APPROVED -- this is a fresh hold for the payment
        # window itself, reusing the same field/lazy-expiry mechanism
        # (_exclude_expired_holds) so a guest who never pays stops blocking
        # the dates without needing a background job. Reset on every call so
        # a genuine retry gets a full fresh window.
        booking.hold_expires_at = timezone.now() + timedelta(minutes=settings.PAYMENT_HOLD_MINUTES)
        booking.save(update_fields=['payment_method', 'payment_status', 'hold_expires_at', 'updated_at'])

        if gateway == PaymentIntent.Gateway.PAYSTACK and not is_debug:
            if not (getattr(settings, 'PAYSTACK_PUBLIC_KEY', '') and getattr(settings, 'PAYSTACK_SECRET_KEY', '')):
                raise ValidationError({'gateway': 'Paystack is not configured on the server.'})
        if gateway == PaymentIntent.Gateway.MPESA and not is_debug:
            mpesa_configured = (
                getattr(settings, 'MPESA_CONSUMER_KEY', '')
                and getattr(settings, 'MPESA_CONSUMER_SECRET', '')
                and getattr(settings, 'MPESA_PASSKEY', '')
            )
            if not mpesa_configured:
                raise ValidationError({'gateway': 'M-Pesa is not configured on the server.'})

        intent = PaymentIntent.objects.create(
            booking=booking,
            traveler=request.user,
            gateway=gateway,
            amount=amount,
            currency=booking.currency,
            reference=generate_reference('INTENT'),
            mpesa_phone=serializer.validated_data.get('mpesa_phone', ''),
        )

        if gateway == PaymentIntent.Gateway.PAYSTACK:
            paystack_data = paystack_client.initialize_transaction(
                email=request.user.email,
                amount=amount,
                currency=booking.currency,
                reference=intent.reference,
                callback_url=f'{settings.SITE_URL}/booking/{booking.id}',
            )
            if paystack_data is None:
                intent.delete()
                raise ValidationError({'gateway': 'Could not start Paystack checkout. Please try again.'})
            intent.paystack_authorization_url = paystack_data['authorization_url']
            intent.client_secret = paystack_data.get('access_code', '')
            intent.status = PaymentIntent.Status.AUTHORIZING
            intent.save()
        elif gateway == PaymentIntent.Gateway.MPESA:
            # Stores provider checkout identifier once returned by provider.
            intent.client_secret = generate_reference('MPESA')
            intent.status = PaymentIntent.Status.AUTHORIZING
            intent.save()

        return Response(PaymentIntentSerializer(intent).data, status=status.HTTP_201_CREATED)


class RetrievePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, reference: str):
        try:
            intent = PaymentIntent.objects.get(reference=reference, traveler=request.user)
        except PaymentIntent.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        return Response(PaymentIntentSerializer(intent).data)


class PaymentHistoryView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(traveler=self.request.user)


@method_decorator(csrf_exempt, name='dispatch')
class WebhookPaystackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload_bytes = request.body
        payload = payload_bytes.decode('utf-8')
        if not _is_valid_paystack_signature(request, payload_bytes):
            return Response({'detail': 'Invalid Paystack signature'}, status=400)

        try:
            data = json.loads(payload)
        except Exception:
            return Response({'detail': 'Invalid payload'}, status=400)

        event = data.get('event', '')
        if event and event != 'charge.success':
            return Response({'ok': True})

        reference = data.get('data', {}).get('reference') or data.get('reference')
        provider_reference = data.get('data', {}).get('id')
        status_str = (data.get('data', {}).get('status') or data.get('status') or '').lower()
        if not reference:
            return Response({'detail': 'Missing reference'}, status=400)

        event_key = f"paystack:{provider_reference or reference}:{status_str or 'unknown'}"
        event, created = PaymentWebhookEvent.objects.get_or_create(
            event_key=event_key,
            defaults={
                'provider': PaymentWebhookEvent.Provider.PAYSTACK,
                'request_id': getattr(request, 'request_id', '') or '',
                'payload': data,
                'processing_notes': 'received',
            },
        )
        if not created and event.processed:
            return Response({'ok': True, 'duplicate': True})

        # Update intent and create payment record
        try:
            intent = PaymentIntent.objects.get(reference=reference)
        except PaymentIntent.DoesNotExist:
            event.processing_notes = 'intent_not_found'
            event.save(update_fields=['processing_notes', 'updated_at'])
            return Response({'detail': 'Intent not found'}, status=404)

        if status_str == 'success':
            intent.status = PaymentIntent.Status.COMPLETED
            intent.save(update_fields=['status', 'updated_at'])
            Payment.objects.get_or_create(
                booking=intent.booking,
                provider_reference=str(provider_reference or reference),
                defaults={
                    'traveler': intent.traveler,
                    'gateway': Payment.Gateway.PAYSTACK,
                    'reference': generate_reference('PAY'),
                    'amount': intent.amount,
                    'currency': intent.currency,
                    'status': Payment.Status.SUCCESS,
                    'description': 'Paystack payment success',
                },
            )
            _update_booking_payment_state(intent.booking)
            event.processed = True
            event.processing_notes = 'success_applied'
        else:
            intent.status = PaymentIntent.Status.FAILED
            intent.save(update_fields=['status', 'updated_at'])
            event.processed = True
            event.processing_notes = f'failed_status:{status_str or "unknown"}'

        event.save(update_fields=['processed', 'processing_notes', 'updated_at'])

        return Response({'ok': True})


def _client_ip(request) -> str:
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _mpesa_callback_is_verified(request, checkout_ref: str, claimed_result_code) -> bool:
    """
    An M-Pesa STK callback has no signature Safaricom controls, so a POST body
    claiming success can't be trusted on its own. Independently ask Safaricom
    for the real status via the STK Push Query API before crediting anything.

    Falls back to trusting the callback only in DEBUG with the same shared
    WEBHOOK_TEST_TOKEN the Paystack webhook uses for local testing, since
    there is no sandbox-callable Daraja setup to verify against in dev.
    """
    result = mpesa_client.query_stk_status(checkout_ref)
    if result is not None:
        verified_code = result.get('ResultCode')
        return str(verified_code) == '0'

    if settings.DEBUG:
        debug_token = getattr(settings, 'WEBHOOK_TEST_TOKEN', '')
        supplied_token = request.headers.get('X-Msafiri-Webhook-Token', '')
        if debug_token and supplied_token and hmac.compare_digest(debug_token, supplied_token):
            return str(claimed_result_code) == '0'

    return False


@method_decorator(csrf_exempt, name='dispatch')
class WebhookMpesaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        allowed_ips = getattr(settings, 'MPESA_WEBHOOK_ALLOWED_IPS', [])
        if allowed_ips and _client_ip(request) not in allowed_ips:
            logger.warning("M-Pesa webhook rejected: source IP not allowlisted")
            return Response({'detail': 'Forbidden'}, status=403)

        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return Response({'detail': 'Invalid payload'}, status=400)

        result_code = (
            data.get('Body', {})
            .get('stkCallback', {})
            .get('ResultCode')
        )
        checkout_ref = (
            data.get('Body', {})
            .get('stkCallback', {})
            .get('CheckoutRequestID')
        )

        callback_metadata = (
            data.get('Body', {})
            .get('stkCallback', {})
            .get('CallbackMetadata', {})
            .get('Item', [])
        )
        callback_map = {
            item.get('Name'): item.get('Value')
            for item in callback_metadata
            if isinstance(item, dict) and item.get('Name')
        }
        client_reference = callback_map.get('MsafiriReference')

        if not checkout_ref and not client_reference:
            return Response({'detail': 'Missing reference'}, status=400)

        event_key = f"mpesa:{checkout_ref or client_reference}:{result_code}"
        event, created = PaymentWebhookEvent.objects.get_or_create(
            event_key=event_key,
            defaults={
                'provider': PaymentWebhookEvent.Provider.MPESA,
                'request_id': getattr(request, 'request_id', '') or '',
                'payload': data,
                'processing_notes': 'received',
            },
        )
        if not created and event.processed:
            return Response({'ok': True, 'duplicate': True})

        intent = None
        if client_reference:
            intent = PaymentIntent.objects.filter(reference=client_reference).first()
        if intent is None and checkout_ref:
            intent = PaymentIntent.objects.filter(client_secret=checkout_ref).first()
        if intent is None and checkout_ref:
            intent = PaymentIntent.objects.filter(reference=checkout_ref).first()
        if intent is None:
            event.processing_notes = 'intent_not_found'
            event.save(update_fields=['processing_notes', 'updated_at'])
            return Response({'detail': 'Intent not found'}, status=404)

        normalized_result = int(result_code) if str(result_code).isdigit() else None

        if normalized_result == 0 and _mpesa_callback_is_verified(request, checkout_ref, normalized_result):
            intent.status = PaymentIntent.Status.COMPLETED
            intent.save(update_fields=['status', 'updated_at'])
            provider_reference = checkout_ref or intent.client_secret or intent.reference
            Payment.objects.get_or_create(
                booking=intent.booking,
                provider_reference=provider_reference,
                defaults={
                    'traveler': intent.traveler,
                    'gateway': Payment.Gateway.MPESA,
                    'reference': generate_reference('PAY'),
                    'amount': intent.amount,
                    'currency': intent.currency,
                    'status': Payment.Status.SUCCESS,
                    'description': 'M-Pesa STK success',
                },
            )
            _update_booking_payment_state(intent.booking)
            event.processed = True
            event.processing_notes = 'success_applied'
        elif normalized_result == 0:
            # Callback claims success but server-side verification couldn't confirm it.
            # Don't credit the booking from an unverified callback alone.
            event.processing_notes = 'unverified_success_claim'
            event.save(update_fields=['processing_notes', 'updated_at'])
            return Response({'ok': True, 'verified': False})
        else:
            intent.status = PaymentIntent.Status.FAILED
            intent.save(update_fields=['status', 'updated_at'])
            event.processed = True
            event.processing_notes = f'failed_result:{normalized_result}'

        event.save(update_fields=['processed', 'processing_notes', 'updated_at'])

        return Response({'ok': True})


def _is_valid_paystack_signature(request, payload_bytes: bytes) -> bool:
    secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
    signature = request.headers.get('X-Paystack-Signature', '')
    if not secret:
        # In development, allow controlled local testing via explicit shared token.
        if bool(getattr(settings, 'DEBUG', False)):
            debug_token = getattr(settings, 'WEBHOOK_TEST_TOKEN', '')
            supplied_token = request.headers.get('X-Msafiri-Webhook-Token', '')
            return bool(debug_token and supplied_token and hmac.compare_digest(debug_token, supplied_token))
        return False
    if not signature:
        return False
    computed = hmac.new(
        key=secret.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)


def _booking_has_conflict(booking: Booking) -> bool:
    """
    True if some *other* booking now occupies this one's dates on the same
    listing -- used only when this booking's own hold has already lapsed
    by the time payment lands, to avoid silently auto-confirming into a
    double-booking. Deliberately conservative: it flags on any overlapping
    booking that still holds a real claim (confirmed, paid/partially paid,
    or within its own unexpired hold), without accounting for a listing's
    quantity/room-type capacity the way booking creation does -- so it can
    over-flag on a listing with multiple units. That's the right tradeoff
    for a safety net that routes to a human rather than deciding by itself:
    a false positive costs someone a review; a false negative is an actual
    double-booking.
    """
    now = timezone.now()
    qs = Booking.objects.filter(
        check_in__lt=booking.check_out, check_out__gt=booking.check_in,
    ).exclude(pk=booking.pk).exclude(status=Booking.BookingStatus.CANCELLED)

    if booking.hotel_id:
        qs = qs.filter(hotel_id=booking.hotel_id)
    elif booking.bnb_listing_id:
        qs = qs.filter(bnb_listing_id=booking.bnb_listing_id)
    else:
        return False

    qs = qs.filter(
        Q(status=Booking.BookingStatus.CONFIRMED)
        | Q(payment_status__in=[Booking.PaymentStatus.PAID, Booking.PaymentStatus.PARTIALLY_PAID])
        | Q(
            host_approval_status__in=[Booking.HostApprovalStatus.PENDING, Booking.HostApprovalStatus.APPROVED],
            hold_expires_at__gte=now,
        )
    )
    return qs.exists()


def _update_booking_payment_state(booking: Booking):
    total_paid = (
        booking.payments.filter(status=Payment.Status.SUCCESS)
        .aggregate(total=Sum('amount'))
        .get('total')
        or Decimal('0')
    )

    if total_paid >= booking.total_amount:
        booking.payment_status = Booking.PaymentStatus.PAID
        if booking.status == Booking.BookingStatus.PENDING:
            hold_lapsed = booking.hold_expires_at and booking.hold_expires_at < timezone.now()
            if hold_lapsed and _booking_has_conflict(booking):
                # Payment succeeded, but only after this booking's own hold
                # had already lapsed, and someone else now has a real claim
                # on the same dates -- don't auto-confirm into that
                # conflict. Leave status as PENDING (payment_status is
                # still recorded as PAID below) so it's visibly anomalous
                # in the admin bookings list and routes to a human instead
                # of silently double-booking the listing.
                logger.warning(
                    'Booking #%s paid after its hold lapsed, with a conflicting booking on the same '
                    'dates -- left as PENDING for manual review instead of auto-confirming.', booking.pk,
                )
            else:
                booking.status = Booking.BookingStatus.CONFIRMED
    elif total_paid > 0:
        booking.payment_status = Booking.PaymentStatus.PARTIALLY_PAID
    else:
        booking.payment_status = (
            Booking.PaymentStatus.PENDING
            if booking.payment_method == Booking.PaymentMethod.ONLINE
            else Booking.PaymentStatus.UNPAID
        )
    booking.save(update_fields=['payment_status', 'status', 'updated_at'])


class SimulatePaymentSuccessView(APIView):
    """
    Dev-only endpoint to mark a payment intent as successful.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.DEBUG:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        logger.warning(
            "Simulated payment success endpoint used",
            extra={
                "request_id": getattr(request, "request_id", None),
                "user_id": getattr(request.user, "id", None),
            },
        )

        reference = request.data.get('reference')
        if not reference:
            return Response({'detail': 'reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            intent = PaymentIntent.objects.get(reference=reference, traveler=request.user)
        except PaymentIntent.DoesNotExist:
            return Response({'detail': 'Intent not found'}, status=status.HTTP_404_NOT_FOUND)

        if intent.status != PaymentIntent.Status.COMPLETED:
            intent.status = PaymentIntent.Status.COMPLETED
            intent.save(update_fields=['status', 'updated_at'])

        provider_ref = f"SIM_{reference}"
        Payment.objects.get_or_create(
            booking=intent.booking,
            provider_reference=provider_ref,
            defaults={
                'traveler': intent.traveler,
                'gateway': intent.gateway,
                'reference': generate_reference('PAY'),
                'amount': intent.amount,
                'currency': intent.currency,
                'status': Payment.Status.SUCCESS,
                'description': 'Simulated payment success',
            },
        )
        _update_booking_payment_state(intent.booking)

        return Response({'ok': True})
