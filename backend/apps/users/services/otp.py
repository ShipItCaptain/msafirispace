"""
Signup verification code (OTP) generation and delivery.

Channels:
- email → EmailOTPSender (Django email backend: console in local, SMTP in prod)
- phone → WhatsAppWebOTPSender when OTP_SENDER_BACKEND=whatsapp_web, else
  ConsoleOTPSender (logs only, for local dev without the sidecar running).

WhatsAppWebOTPSender calls the whatsapp-service sidecar (../../whatsapp-service)
over HTTP. That service automates WhatsApp Web via whatsapp-web.js on a
dedicated number -- a pilot measure, not an official API. See that service's
module docstring for the ban-risk tradeoff and the plan to replace it with a
real provider (Twilio / Meta Cloud API / Africa's Talking) before public launch.
"""
import json
import logging
import secrets
import string
import urllib.error
import urllib.request

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger(__name__)


def _generate_numeric_code(length):
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_and_assign_code(user):
    """
    Creates a new code for the user, stores only its hash, and returns the
    raw code so the caller can send it. The raw code is never persisted.
    """
    code = _generate_numeric_code(settings.OTP_CODE_LENGTH)
    user.verification_code_hash = make_password(code)
    user.verification_code_expires = timezone.now() + timezone.timedelta(
        minutes=settings.OTP_EXPIRY_MINUTES
    )
    user.verification_code_attempts = 0
    user.verification_last_sent_at = timezone.now()
    user.save(update_fields=[
        'verification_code_hash', 'verification_code_expires',
        'verification_code_attempts', 'verification_last_sent_at',
    ])
    return code


def check_code(user, submitted_code):
    """
    Compares a submitted code against the stored hash. Does not check
    expiry or attempt count -- the caller is responsible for those.
    """
    if not user.verification_code_hash or not submitted_code:
        return False
    return check_password(str(submitted_code).strip(), user.verification_code_hash)


class ConsoleOTPSender:
    """Logs the code instead of sending it -- used for the phone/WhatsApp
    channel until a real provider is integrated."""

    def send(self, user, code):
        logger.info(
            "[OTP] Verification code for %s (phone %s): %s",
            user.email, user.phone_number, code,
        )


class EmailOTPSender:
    """Sends the code via Django's configured email backend."""

    def send(self, user, code):
        expiry = settings.OTP_EXPIRY_MINUTES
        subject = 'Your Msafiri Space verification code'
        text_body = (
            f'Hi {user.first_name or "there"},\n\n'
            f'Your Msafiri Space verification code is: {code}\n\n'
            f'This code expires in {expiry} minutes.\n'
            f'If you did not create an account, you can ignore this email.\n\n'
            f'— Msafiri Space'
        )
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
          <p style="font-size: 16px;">Hi {user.first_name or 'there'},</p>
          <p style="font-size: 16px;">Use this code to verify your Msafiri Space account:</p>
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; text-align: center; margin: 28px 0; color: #dc2626;">
            {code}
          </p>
          <p style="font-size: 14px; color: #6b7280;">This code expires in {expiry} minutes.</p>
          <p style="font-size: 14px; color: #6b7280;">If you did not create an account, you can ignore this email.</p>
        </div>
        """

        # In local/dev, always mirror the code to logs so hosts can verify
        # without configuring SMTP (EMAIL_BACKEND=console prints the message too).
        if settings.DEBUG:
            logger.info(
                "[OTP EMAIL] code=%s to=%s (also sent via %s)",
                code,
                user.email,
                settings.EMAIL_BACKEND,
            )

        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
        logger.info("[OTP EMAIL] Verification code sent to %s", user.email)


class WhatsAppWebOTPSender:
    """Sends the code via the whatsapp-service sidecar (whatsapp-web.js on a
    dedicated number). Pilot measure -- see this module's docstring."""

    def send(self, user, code):
        expiry = settings.OTP_EXPIRY_MINUTES
        payload = json.dumps({
            'phone_number': user.phone_number,
            'code': code,
            'expiry_minutes': expiry,
        }).encode('utf-8')
        request = urllib.request.Request(
            f'{settings.WHATSAPP_SERVICE_URL.rstrip("/")}/send-otp',
            data=payload,
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'X-Internal-Token': settings.WHATSAPP_SERVICE_TOKEN,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                response.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
            logger.exception(
                "WhatsApp OTP send failed for %s via whatsapp-service: %s",
                user.phone_number, exc,
            )
            raise
        logger.info("[OTP WHATSAPP] Verification code sent to %s", user.phone_number)


def get_otp_sender(channel):
    if channel == 'email':
        return EmailOTPSender()
    if channel == 'phone' and settings.OTP_SENDER_BACKEND == 'whatsapp_web':
        return WhatsAppWebOTPSender()
    return ConsoleOTPSender()


def send_verification_code(user):
    """Generate a fresh code and deliver it on the user's chosen channel."""
    code = generate_and_assign_code(user)
    channel = (user.verification_method or 'email').strip().lower()
    sender = get_otp_sender(channel)
    try:
        sender.send(user, code)
    except Exception:
        logger.exception(
            "Failed to send verification code via %s to %s",
            channel,
            user.email,
        )
        raise
    return code
