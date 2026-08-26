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
