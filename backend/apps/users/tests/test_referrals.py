import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def _create_user(username, email):
    return User.objects.create_user(
        username=username, email=email, password='testpass123',
        first_name='Test', last_name='User',
    )


def _register_payload(**overrides):
    payload = {
        'email': 'newcomer@example.com',
        'username': 'newcomer',
        'first_name': 'New',
        'last_name': 'Comer',
        'password': 'StrongPass123!',
        'password_confirm': 'StrongPass123!',
        'roles': ['guest'],
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_registration_with_valid_referral_code_sets_referred_by():
    referrer = _create_user('referrer_user', 'referrer@example.com')

    client = APIClient()
    response = client.post('/api/v1/auth/register/', _register_payload(referral_code=referrer.referral_code), format='json')

    assert response.status_code == 201, response.data
    new_user = User.objects.get(email='newcomer@example.com')
    assert new_user.referred_by_id == referrer.id


@pytest.mark.django_db
def test_registration_with_invalid_referral_code_still_succeeds():
    client = APIClient()
    response = client.post('/api/v1/auth/register/', _register_payload(referral_code='NOT-A-REAL-CODE'), format='json')

    assert response.status_code == 201, response.data
    new_user = User.objects.get(email='newcomer@example.com')
    assert new_user.referred_by_id is None


@pytest.mark.django_db
def test_registration_without_referral_code_succeeds():
    client = APIClient()
    response = client.post('/api/v1/auth/register/', _register_payload(), format='json')

    assert response.status_code == 201, response.data
    new_user = User.objects.get(email='newcomer@example.com')
    assert new_user.referred_by_id is None


@pytest.mark.django_db
def test_referral_stats_view_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/auth/referral-stats/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_referral_stats_reports_referred_users():
    referrer = _create_user('referrer_user2', 'referrer2@example.com')
    referred1 = _create_user('referred_one', 'referred1@example.com')
    referred1.referred_by = referrer
    referred1.save()
    referred2 = _create_user('referred_two', 'referred2@example.com')
    referred2.referred_by = referrer
    referred2.save()

    client = APIClient()
    client.force_authenticate(user=referrer)
    response = client.get('/api/v1/auth/referral-stats/')

    assert response.status_code == 200
    assert response.data['referral_code'] == referrer.referral_code
    assert response.data['referral_link'].endswith(f'/register?ref={referrer.referral_code}')
    assert response.data['referred_count'] == 2
    names = {entry['name'] for entry in response.data['referred_users']}
    assert names == {referred1.get_display_name(), referred2.get_display_name()}


@pytest.mark.django_db
def test_referral_stats_shows_who_referred_you():
    referrer = _create_user('referrer_user3', 'referrer3@example.com')
    referred = _create_user('referred_three', 'referred3@example.com')
    referred.referred_by = referrer
    referred.save()

    client = APIClient()
    client.force_authenticate(user=referred)
    response = client.get('/api/v1/auth/referral-stats/')

    assert response.status_code == 200
    assert response.data['referred_by'] == referrer.get_display_name()
    assert response.data['referred_count'] == 0
