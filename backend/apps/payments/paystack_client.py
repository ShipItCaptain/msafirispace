"""
Minimal Paystack client used to initialize a hosted checkout transaction.
Mirrors the shape of mpesa_client.py.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BASE_URL = 'https://api.paystack.co'


def is_configured() -> bool:
    return bool(settings.PAYSTACK_SECRET_KEY)


def initialize_transaction(email: str, amount, currency: str, reference: str, callback_url: str):
    """
    Calls Paystack's Initialize Transaction API. Returns the response dict's
    'data' (with 'authorization_url', 'access_code', 'reference') on success,
    or None if unconfigured or the request failed.
    """
    if not is_configured():
        return None
    try:
        response = requests.post(
            f'{BASE_URL}/transaction/initialize',
            json={
                'email': email,
                'amount': int(amount * 100),  # Paystack expects the lowest currency subunit
                'currency': currency,
                'reference': reference,
                'callback_url': callback_url,
            },
            headers={'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get('status'):
            logger.warning('Paystack initialize_transaction returned status=false: %s', payload.get('message'))
            return None
        return payload.get('data')
    except requests.RequestException:
        logger.exception('Paystack initialize_transaction request failed for reference %s', reference)
        return None
