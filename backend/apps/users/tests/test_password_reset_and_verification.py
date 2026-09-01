from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


def _create_user(username, email, **kwargs):
    return User.objects.create_user(
        username=username, email=email, password='OldPass123!',
        first_name='Test', last_name='User', **kwargs
    )


@pytest.mark.django_db
def test_reset_request_does_not_reveal_whether_email_exists():
    _create_user('reset_user', 'reset_user@example.com')

    client = APIClient()
    real_response = client.post('/api/v1/auth/reset-password/', {'email': 'reset_user@example.com'}, format='json')
    fake_response = client.post('/api/v1/auth/reset-password/', {'email': 'nobody_here@example.com'}, format='json')

    assert real_response.status_code == 200
    assert fake_response.status_code == 200
    assert real_response.data == fake_response.data


@pytest.mark.django_db
def test_reset_request_sets_token_only_for_real_account():
    user = _create_user('reset_user2', 'reset_user2@example.com')

    client = APIClient()
    client.post('/api/v1/auth/reset-password/', {'email': 'reset_user2@example.com'}, format='json')
    client.post('/api/v1/auth/reset-password/', {'email': 'ghost@example.com'}, format='json')

    user.refresh_from_db()
    assert user.password_reset_token
    assert user.password_reset_expires > timezone.now()
    assert not User.objects.filter(email='ghost@example.com').exists()


@pytest.mark.django_db
def test_reset_confirm_with_valid_token_changes_password():
    user = _create_user('reset_user3', 'reset_user3@example.com')
    user.password_reset_token = 'validtoken123'
    user.password_reset_expires = timezone.now() + timedelta(hours=1)
    user.save()

    client = APIClient()
    response = client.post('/api/v1/auth/reset-password/confirm/', {
        'token': 'validtoken123',
        'new_password': 'BrandNewPass123!',
        'new_password_confirm': 'BrandNewPass123!',
    }, format='json')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.password_reset_token is None
    assert user.check_password('BrandNewPass123!')


@pytest.mark.django_db
def test_reset_confirm_rejects_expired_token():
    user = _create_user('reset_user4', 'reset_user4@example.com')
    user.password_reset_token = 'expiredtoken'
    user.password_reset_expires = timezone.now() - timedelta(hours=1)
    user.save()

    client = APIClient()
    response = client.post('/api/v1/auth/reset-password/confirm/', {
        'token': 'expiredtoken',
        'new_password': 'BrandNewPass123!',
        'new_password_confirm': 'BrandNewPass123!',
    }, format='json')

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password('OldPass123!')


@pytest.mark.django_db
def test_reset_confirm_rejects_mismatched_passwords():
    user = _create_user('reset_user5', 'reset_user5@example.com')
    user.password_reset_token = 'sometoken'
    user.password_reset_expires = timezone.now() + timedelta(hours=1)
    user.save()

    client = APIClient()
    response = client.post('/api/v1/auth/reset-password/confirm/', {
        'token': 'sometoken',
        'new_password': 'BrandNewPass123!',
        'new_password_confirm': 'SomethingElse123!',
    }, format='json')

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password('OldPass123!')


@pytest.mark.django_db
def test_verify_email_with_valid_token():
    user = _create_user('verify_user', 'verify_user@example.com')
    user.email_verification_token = 'verifytoken123'
    user.email_verified = False
    user.save()

    client = APIClient()
    response = client.post('/api/v1/auth/verify-email/', {'token': 'verifytoken123'}, format='json')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email_verified is True
    assert user.email_verification_token is None


@pytest.mark.django_db
def test_verify_email_rejects_invalid_token():
    client = APIClient()
    response = client.post('/api/v1/auth/verify-email/', {'token': 'not-a-real-token'}, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_resend_verification_requires_auth():
    client = APIClient()
    response = client.post('/api/v1/auth/resend-verification/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_resend_verification_issues_new_token():
    user = _create_user('resend_user', 'resend_user@example.com', email_verified=False)

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/resend-verification/')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email_verification_token
