import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_host_onboarding_bnb_profile_created_and_response_shape():
    User = get_user_model()
    user = User.objects.create_user(
        username='bnbhost',
        email='bnb@example.com',
        password='testpass123',
        first_name='BnB',
        last_name='Host',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        '/api/v1/auth/host/onboard/',
        {
            'host_type': 'bnb_host',
            'room_count': 2,
            'guest_capacity': 4,
        },
        format='json',
    )

    assert response.status_code == 201
    data = response.json()
    assert data['host_type'] == 'bnb_host'
    assert 'host_profile' in data
    assert 'host_type' not in data['host_profile']

    user.refresh_from_db()
    assert user.host_type == User.HostType.BNB_HOST
    assert user.user_type == User.UserType.HOST


@pytest.mark.django_db
def test_host_onboarding_hotel_profile_created_and_response_shape():
    User = get_user_model()
    user = User.objects.create_user(
        username='hotelhost',
        email='hotel@example.com',
        password='testpass123',
        first_name='Hotel',
        last_name='Host',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        '/api/v1/auth/host/onboard/',
        {
            'host_type': 'hotel_restaurant_host',
            'room_count': 10,
            'guest_capacity': 20,
            'property_name': 'Test Hotel',
        },
        format='json',
    )

    assert response.status_code == 201
    data = response.json()
    assert data['host_type'] == 'hotel_restaurant_host'
    assert 'host_profile' in data
    assert 'host_type' not in data['host_profile']

    user.refresh_from_db()
    assert user.host_type == User.HostType.HOTEL_RESTAURANT_HOST
    assert user.user_type == User.UserType.HOST
