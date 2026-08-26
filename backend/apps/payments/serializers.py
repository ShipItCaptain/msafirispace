"""
Serializers for payments app
"""
from rest_framework import serializers
from django.utils.crypto import get_random_string

from .models import Payment, PaymentIntent
from apps.bookings.models import Booking


class PaymentIntentCreateSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    gateway = serializers.ChoiceField(choices=PaymentIntent.Gateway.choices)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    mpesa_phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context['request'].user
        try:
            booking = Booking.objects.get(pk=attrs['booking_id'], traveler=user)
        except Booking.DoesNotExist:
            raise serializers.ValidationError({'booking_id': 'Booking not found'})

        attrs['booking'] = booking

        # Basic sanity checks
        if attrs['amount'] <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be positive'})
        
        if booking.status in [Booking.BookingStatus.CANCELLED, Booking.BookingStatus.COMPLETED]:
            raise serializers.ValidationError({'booking_id': 'Cannot pay for cancelled or completed booking'})

        if booking.payment_status == Booking.PaymentStatus.PAID:
            raise serializers.ValidationError({'booking_id': 'Booking is already paid'})

        # Amount must match total or deposit (if deposit is configured)
        total_amount = booking.total_amount
        deposit_amount = booking.deposit_amount
        if attrs['amount'] != total_amount and (deposit_amount <= 0 or attrs['amount'] != deposit_amount):
            raise serializers.ValidationError({'amount': 'Amount must match total or deposit amount'})

        return attrs


class PaymentIntentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentIntent
        fields = [
            'reference', 'gateway', 'amount', 'currency', 'status',
            'paystack_authorization_url', 'mpesa_phone', 'client_secret',
            'created_at'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'reference', 'gateway', 'amount', 'currency', 'status',
            'provider_reference', 'description', 'created_at'
        ]

