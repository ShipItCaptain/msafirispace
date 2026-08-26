import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import Favorite, Hotel


@pytest.mark.django_db
def test_hotel_favorites_add_list_remove():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='hotelfavuser',
        email='hotelfav@example.com',
        password='testpass123',
    )

    hotel = Hotel.objects.create(
        host=user,
        name='Favorite Hotel',
        description='A hotel to save as favorite',
        short_description='Favorite hotel short description',
        star_rating=3,
        address='Wote town',
        city='Wote',
        country='Kenya',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    create_response = client.post(
        '/api/v1/listings/favorites/',
        {'hotel_id': hotel.id},
        format='json',
    )
    assert create_response.status_code == 201
    assert Favorite.objects.filter(user=user, hotel=hotel).exists()

    list_response = client.get('/api/v1/listings/favorites/')
    assert list_response.status_code == 200
    data = list_response.json()
    results = data.get('results', data)
    assert len(results) == 1
    assert results[0]['hotel']['id'] == hotel.id

    delete_response = client.delete(f'/api/v1/listings/favorites/{hotel.id}/')
    assert delete_response.status_code == 204
    assert not Favorite.objects.filter(user=user, hotel=hotel).exists()


@pytest.mark.django_db
def test_hotel_favorites_duplicate_add_is_idempotent():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='hotelfavdup',
        email='hotelfavdup@example.com',
        password='testpass123',
    )
    hotel = Hotel.objects.create(
        host=user,
        name='Duplicate Favorite Hotel',
        description='dup',
        short_description='dup',
        star_rating=3,
        address='Wote town',
        city='Wote',
        country='Kenya',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    first = client.post('/api/v1/listings/favorites/', {'hotel_id': hotel.id}, format='json')
    second = client.post('/api/v1/listings/favorites/', {'hotel_id': hotel.id}, format='json')

    assert first.status_code == 201
    assert second.status_code == 201
    assert Favorite.objects.filter(user=user, hotel=hotel).count() == 1


@pytest.mark.django_db
def test_hotel_favorites_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/listings/favorites/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_hotel_favorite_delete_missing_returns_404():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='hotelfav404',
        email='hotelfav404@example.com',
        password='testpass123',
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.delete('/api/v1/listings/favorites/999999/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_hotel_favorite_invalid_hotel_returns_400():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='hotelfavbad',
        email='hotelfavbad@example.com',
        password='testpass123',
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/listings/favorites/', {'hotel_id': 999999}, format='json')
    assert response.status_code == 400
