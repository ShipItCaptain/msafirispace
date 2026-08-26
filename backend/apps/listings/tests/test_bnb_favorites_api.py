import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import BnBFavorite, BnBListing


@pytest.mark.django_db
def test_bnb_favorites_add_list_remove():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbfavuser',
        email='bnbfav@example.com',
        password='testpass123',
    )

    listing = BnBListing.objects.create(
        host=user,
        title='Favorite Me',
        city='Nairobi',
        country='Kenya',
        price_per_night='3500.00',
        bedrooms=1,
        bathrooms=1,
        max_guests=2,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    create_response = client.post(
        '/api/v1/listings/favorites/bnb/',
        {'bnb_listing_id': listing.id},
        format='json',
    )
    assert create_response.status_code == 201
    assert BnBFavorite.objects.filter(user=user, bnb_listing=listing).exists()

    list_response = client.get('/api/v1/listings/favorites/bnb/')
    assert list_response.status_code == 200
    data = list_response.json()
    results = data.get('results', data)
    assert len(results) == 1
    assert results[0]['bnb_listing']['id'] == listing.id

    delete_response = client.delete(f'/api/v1/listings/favorites/bnb/{listing.id}/')
    assert delete_response.status_code == 204
    assert not BnBFavorite.objects.filter(user=user, bnb_listing=listing).exists()


@pytest.mark.django_db
def test_bnb_favorites_duplicate_add_is_idempotent():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbfavdup',
        email='bnbfavdup@example.com',
        password='testpass123',
    )
    listing = BnBListing.objects.create(
        host=user,
        title='Duplicate BnB Favorite',
        city='Nairobi',
        country='Kenya',
        price_per_night='4500.00',
        bedrooms=1,
        bathrooms=1,
        max_guests=2,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    first = client.post('/api/v1/listings/favorites/bnb/', {'bnb_listing_id': listing.id}, format='json')
    second = client.post('/api/v1/listings/favorites/bnb/', {'bnb_listing_id': listing.id}, format='json')

    assert first.status_code == 201
    assert second.status_code == 201
    assert BnBFavorite.objects.filter(user=user, bnb_listing=listing).count() == 1


@pytest.mark.django_db
def test_bnb_favorites_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/listings/favorites/bnb/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_bnb_favorite_delete_missing_returns_404():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbfav404',
        email='bnbfav404@example.com',
        password='testpass123',
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.delete('/api/v1/listings/favorites/bnb/999999/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_bnb_favorite_invalid_listing_returns_400():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbfavbad',
        email='bnbfavbad@example.com',
        password='testpass123',
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/listings/favorites/bnb/', {'bnb_listing_id': 999999}, format='json')
    assert response.status_code == 400
