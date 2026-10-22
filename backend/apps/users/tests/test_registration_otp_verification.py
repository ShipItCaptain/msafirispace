from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


def _valid_registration_payload(**overrides):
    payload = {
        'email': 'newguest@example.com',
        'first_name': 'Jane',
        'last_name': 'Doe',
        'id_full_name': 'Jane Wanjiru Doe',
        'id_number': '12345678',
        'phone_number': '+254700123456',
        'verification_method': 'email',
        'password': 'StrongPass123!',
        'password_confirm': 'StrongPass123!',
    }
    payload.update(overrides)
    return payload


def _set_code(user, code, expires_in_minutes=10, attempts=0):
    user.verification_code_hash = make_password(code)
    user.verification_code_expires = timezone.now() + timedelta(minutes=expires_in_minutes)
    user.verification_code_attempts = attempts
    user.verification_last_sent_at = timezone.now()
    user.save()


@pytest.mark.django_db
def test_registration_creates_unverified_account_with_no_tokens():
    client = APIClient()
    response = client.post('/api/v1/auth/register/', _valid_registration_payload(), format='json')

    assert response.status_code == 201
    assert 'tokens' not in response.data

    user = User.objects.get(email='newguest@example.com')
    assert user.account_verified is False
    assert user.verification_code_hash
    assert user.verification_code_expires > timezone.now()


@pytest.mark.django_db
@pytest.mark.parametrize('missing_field', ['id_number', 'id_full_name', 'phone_number', 'verification_method'])
def test_registration_requires_new_fields(missing_field):
    payload = _valid_registration_payload()
    payload.pop(missing_field)

    client = APIClient()
    response = client.post('/api/v1/auth/register/', payload, format='json')

    assert response.status_code == 400
    assert missing_field in response.data


@pytest.mark.django_db
def test_verify_code_with_correct_code_activates_account_and_returns_tokens():
    user = User.objects.create_user(
        username='verifyme', email='verifyme@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '123456')

    client = APIClient()
    response = client.post('/api/v1/auth/verify-code/', {
        'email': 'verifyme@example.com', 'code': '123456',
    }, format='json')

    assert response.status_code == 200
    assert 'tokens' in response.data
    user.refresh_from_db()
    assert user.account_verified is True
    assert user.email_verified is True
    assert user.verification_code_hash is None


@pytest.mark.django_db
def test_verify_code_with_phone_channel_sets_phone_verified():
    user = User.objects.create_user(
        username='verifyphone', email='verifyphone@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='phone',
    )
    _set_code(user, '654321')

    client = APIClient()
    response = client.post('/api/v1/auth/verify-code/', {
        'email': 'verifyphone@example.com', 'code': '654321',
    }, format='json')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.account_verified is True
    assert user.phone_verified is True
    assert user.email_verified is False


@pytest.mark.django_db
def test_verify_code_rejects_wrong_code_and_increments_attempts():
    user = User.objects.create_user(
        username='wrongcode', email='wrongcode@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '111111')

    client = APIClient()
    response = client.post('/api/v1/auth/verify-code/', {
        'email': 'wrongcode@example.com', 'code': '000000',
    }, format='json')

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.account_verified is False
    assert user.verification_code_attempts == 1


@pytest.mark.django_db
@override_settings(OTP_MAX_ATTEMPTS=3)
def test_verify_code_rejects_after_max_attempts_even_with_correct_code():
    user = User.objects.create_user(
        username='maxattempts', email='maxattempts@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '222222', attempts=3)

    client = APIClient()
    response = client.post('/api/v1/auth/verify-code/', {
        'email': 'maxattempts@example.com', 'code': '222222',
    }, format='json')

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.account_verified is False


@pytest.mark.django_db
def test_verify_code_rejects_expired_code():
    user = User.objects.create_user(
        username='expiredcode', email='expiredcode@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '333333', expires_in_minutes=-1)

    client = APIClient()
    response = client.post('/api/v1/auth/verify-code/', {
        'email': 'expiredcode@example.com', 'code': '333333',
    }, format='json')

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.account_verified is False


@pytest.mark.django_db
def test_resend_code_generates_new_code_and_resets_attempts():
    user = User.objects.create_user(
        username='resendotp', email='resendotp@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '444444', attempts=2)
    user.verification_last_sent_at = timezone.now() - timedelta(minutes=5)
    user.save()

    client = APIClient()
    response = client.post('/api/v1/auth/resend-code/', {'email': 'resendotp@example.com'}, format='json')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.verification_code_attempts == 0
    from django.contrib.auth.hashers import check_password
    assert not check_password('444444', user.verification_code_hash)


@pytest.mark.django_db
def test_resend_code_within_cooldown_is_rate_limited():
    user = User.objects.create_user(
        username='cooldown', email='cooldown@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    _set_code(user, '555555')  # verification_last_sent_at = now()

    client = APIClient()
    response = client.post('/api/v1/auth/resend-code/', {'email': 'cooldown@example.com'}, format='json')

    assert response.status_code == 429


@pytest.mark.django_db
def test_resend_code_does_not_reveal_whether_email_exists():
    client = APIClient()
    real_user = User.objects.create_user(
        username='realuser', email='realuser@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email',
    )
    real_user.verification_last_sent_at = timezone.now() - timedelta(minutes=5)
    real_user.save()

    real_response = client.post('/api/v1/auth/resend-code/', {'email': 'realuser@example.com'}, format='json')
    fake_response = client.post('/api/v1/auth/resend-code/', {'email': 'ghost@example.com'}, format='json')

    assert real_response.status_code == 200
    assert fake_response.status_code == 200
    assert real_response.data == fake_response.data


@pytest.mark.django_db
def test_login_blocked_for_unverified_account():
    User.objects.create_user(
        username='unverifiedlogin', email='unverifiedlogin@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email', account_verified=False,
    )

    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': 'unverifiedlogin@example.com', 'password': 'StrongPass123!',
    }, format='json')

    assert response.status_code == 403
    assert response.data['error'] == 'account_not_verified'


@pytest.mark.django_db
def test_login_succeeds_for_verified_account():
    User.objects.create_user(
        username='verifiedlogin', email='verifiedlogin@example.com', password='StrongPass123!',
        first_name='Jane', last_name='Doe', verification_method='email', account_verified=True,
    )

    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': 'verifiedlogin@example.com', 'password': 'StrongPass123!',
    }, format='json')

    assert response.status_code == 200
    assert 'tokens' in response.data
