"""
Minimal Safaricom Daraja client used to independently verify STK Push
callbacks server-side, rather than trusting whatever a webhook POST claims.
"""
import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke'
PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke'


def _base_url() -> str:
    return PRODUCTION_BASE_URL if settings.MPESA_ENVIRONMENT == 'production' else SANDBOX_BASE_URL


def is_configured() -> bool:
    return bool(
        settings.MPESA_CONSUMER_KEY
        and settings.MPESA_CONSUMER_SECRET
        and settings.MPESA_PASSKEY
        and settings.MPESA_SHORTCODE
    )


def get_access_token():
    """OAuth2 client-credentials token. Returns None if unconfigured or the request fails."""
    if not (settings.MPESA_CONSUMER_KEY and settings.MPESA_CONSUMER_SECRET):
        return None
    try:
        response = requests.get(
            f'{_base_url()}/oauth/v1/generate',
            params={'grant_type': 'client_credentials'},
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=10,
        )
        response.raise_for_status()
        return response.json().get('access_token')
    except requests.RequestException:
        logger.exception('M-Pesa OAuth token request failed')
        return None


def query_stk_status(checkout_request_id: str):
    """
    Independently ask Safaricom for the real result of an STK push, instead of
    trusting a webhook callback claiming to be Safaricom. Returns the parsed
    response dict, or None if verification couldn't be performed (unconfigured,
    network failure, or Safaricom returned an error) — callers must treat None
    as "not verified", never as success.
    """
    if not is_configured():
        return None
    token = get_access_token()
    if not token:
        return None

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = base64.b64encode(
        f'{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}'.encode('utf-8')
    ).decode('utf-8')

    try:
        response = requests.post(
            f'{_base_url()}/mpesa/stkpushquery/v1/query',
            json={
                'BusinessShortCode': settings.MPESA_SHORTCODE,
                'Password': password,
                'Timestamp': timestamp,
                'CheckoutRequestID': checkout_request_id,
            },
            headers={'Authorization': f'Bearer {token}'},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        logger.exception('M-Pesa STK status query failed for %s', checkout_request_id)
        return None
