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


