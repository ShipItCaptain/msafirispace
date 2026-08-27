import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_create_bnb_listing_authenticated_user():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbcreator',
        email='bnbcreator@example.com',
        password='testpass123',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'title': 'Test BnB Listing',
        'city': 'Nairobi',
        'country': 'Kenya',
        'price_per_night': '5500.00',
        'bedrooms': 2,
        'bathrooms': 1,
        'max_guests': 3,
        'amenities': ['WiFi', 'Kitchen'],
        'house_rules': ['No smoking'],
    }

    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201
    data = response.json()

    assert data['title'] == payload['title']
    assert data['city'] == payload['city']
    assert data['host'] == user.id
    assert data['price_per_night'] == payload['price_per_night']

    # Creating a listing should grant the matching host role automatically —
    # otherwise host-only endpoints (e.g. the host dashboard summary) 403
    # for a user who legitimately owns a listing.
    user.refresh_from_db()
    assert 'bnb_host' in user.roles
    assert user.active_role == 'bnb_host'


@pytest.mark.django_db
def test_create_bnb_listing_does_not_override_existing_active_role():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbcreator2',
        email='bnbcreator2@example.com',
        password='testpass123',
        roles=['guest', 'hotel_host'],
        active_role='hotel_host',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'title': 'Second BnB Listing',
        'city': 'Nairobi',
        'country': 'Kenya',
        'price_per_night': '5500.00',
        'bedrooms': 2,
        'bathrooms': 1,
        'max_guests': 3,
    }
    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201

    user.refresh_from_db()
    assert 'bnb_host' in user.roles
    # A user already actively hosting elsewhere shouldn't get silently
    # switched away from that role just for adding a second listing type.
    assert user.active_role == 'hotel_host'
