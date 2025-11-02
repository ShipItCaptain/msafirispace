"""
Views for payments app (Mpesa and Paystack minimal integration)
"""
import json
from decimal import Decimal
from django.conf import settings
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import Payment, PaymentIntent
from .serializers import (
    PaymentIntentCreateSerializer,
    PaymentIntentSerializer,
    PaymentSerializer,
)


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

        intent = PaymentIntent.objects.create(
            booking=booking,
            traveler=request.user,
            gateway=gateway,
            amount=amount,
            currency=booking.currency,
            reference=generate_reference('INTENT'),
            mpesa_phone=serializer.validated_data.get('mpesa_phone', ''),
        )

        # Minimal gateway bootstrapping (mock):
        if gateway == PaymentIntent.Gateway.PAYSTACK:
            # Normally you'd call Paystack initialize endpoint here
            intent.paystack_authorization_url = f"https://paystack.com/pay/{intent.reference.lower()}"
            intent.status = PaymentIntent.Status.AUTHORIZING
            intent.save()
        elif gateway == PaymentIntent.Gateway.MPESA:
            # Normally you'd trigger STK push here
            intent.client_secret = intent.reference
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


@method_decorator(csrf_exempt, name='dispatch')
class WebhookPaystackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body.decode('utf-8')
        try:
            data = json.loads(payload)
        except Exception:
            return Response({'detail': 'Invalid payload'}, status=400)

        reference = data.get('data', {}).get('reference') or data.get('reference')
        status_str = (data.get('data', {}).get('status') or data.get('status') or '').lower()
        if not reference:
            return Response({'detail': 'Missing reference'}, status=400)

        # Update intent and create payment record
        try:
            intent = PaymentIntent.objects.get(reference=reference)
        except PaymentIntent.DoesNotExist:
            return Response({'detail': 'Intent not found'}, status=404)

        if status_str == 'success':
            intent.status = PaymentIntent.Status.COMPLETED
            intent.save()
            Payment.objects.get_or_create(
                booking=intent.booking,
                traveler=intent.traveler,
                gateway=Payment.Gateway.PAYSTACK,
                reference=generate_reference('PAY'),
                defaults={
                    'amount': intent.amount,
                    'currency': intent.currency,
                    'status': Payment.Status.SUCCESS,
                    'provider_reference': reference,
                    'description': 'Paystack payment success',
                }
            )
        else:
            intent.status = PaymentIntent.Status.FAILED
            intent.save()

        return Response({'ok': True})


@method_decorator(csrf_exempt, name='dispatch')
class WebhookMpesaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Accept generic M-Pesa callback and mark as success if ResultCode == 0
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

        if not checkout_ref:
            return Response({'detail': 'Missing reference'}, status=400)

        try:
            intent = PaymentIntent.objects.get(reference=checkout_ref)
        except PaymentIntent.DoesNotExist:
            # We allow reference mismatch in this mock; in real flow map provider ref to our ref
            return Response({'detail': 'Intent not found'}, status=404)

        if result_code == 0:
            intent.status = PaymentIntent.Status.COMPLETED
            intent.save()
            Payment.objects.get_or_create(
                booking=intent.booking,
                traveler=intent.traveler,
                gateway=Payment.Gateway.MPESA,
                reference=generate_reference('PAY'),
                defaults={
                    'amount': intent.amount,
                    'currency': intent.currency,
                    'status': Payment.Status.SUCCESS,
                    'provider_reference': checkout_ref,
                    'description': 'M-Pesa STK success',
                }
            )
        else:
            intent.status = PaymentIntent.Status.FAILED
            intent.save()

        return Response({'ok': True})


