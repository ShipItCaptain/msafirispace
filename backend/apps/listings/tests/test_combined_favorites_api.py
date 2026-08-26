import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import BnBListing, Favorite, BnBFavorite, Hotel


@pytest.mark.django_db
def test_combined_favorites_returns_hotel_and_bnb():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='combinedfav',
        email='combinedfav@example.com',
        password='testpass123',
    )
    hotel = Hotel.objects.create(
        host=user,
        name='Combined Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
    )
    bnb = BnBListing.objects.create(
        host=user,
        title='Combined BnB',
        city='Wote',
        country='Kenya',
        price_per_night='3000.00',
        bedrooms=1,
        bathrooms=1,
        max_guests=2,
    )
    Favorite.objects.create(user=user, hotel=hotel)
    BnBFavorite.objects.create(user=user, bnb_listing=bnb)

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/listings/favorites/combined/')

    assert response.status_code == 200
    results = response.json().get('results', [])
    assert len(results) == 2
    types = {item.get('type') for item in results}
    assert types == {'hotel', 'bnb'}


@pytest.mark.django_db
def test_combined_favorites_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/listings/favorites/combined/')
    assert response.status_code == 401
