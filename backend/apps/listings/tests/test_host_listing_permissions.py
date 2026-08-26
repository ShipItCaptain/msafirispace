from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import Hotel, RoomType


@pytest.fixture
def user_model():
    return get_user_model()


def _create_user(user_model, username, email):
    return user_model.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
    )


def _create_hotel(host, name='Test Hotel'):
    return Hotel.objects.create(
        host=host,
        name=name,
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
    )


@pytest.mark.django_db
def test_hotel_delete_requires_owner(user_model):
    owner = _create_user(user_model, 'hotel_owner', 'hotelowner@example.com')
    other = _create_user(user_model, 'hotel_other', 'hotelother@example.com')
    hotel = _create_hotel(owner)

    client = APIClient()
    client.force_authenticate(user=other)

    response = client.delete(f'/api/v1/listings/hotels/{hotel.id}/')
    assert response.status_code == 403


@pytest.mark.django_db
def test_hotel_owner_delete_is_soft_delete(user_model):
    owner = _create_user(user_model, 'hotel_owner2', 'hotelowner2@example.com')
    hotel = _create_hotel(owner, name='Owner Hotel')

    client = APIClient()
    client.force_authenticate(user=owner)

    response = client.delete(f'/api/v1/listings/hotels/{hotel.id}/')
    assert response.status_code == 204
    hotel.refresh_from_db()
    assert hotel.is_active is False


@pytest.mark.django_db
def test_room_type_create_requires_hotel_ownership(user_model):
    owner = _create_user(user_model, 'room_owner', 'roomowner@example.com')
    other = _create_user(user_model, 'room_other', 'roomother@example.com')
    hotel = _create_hotel(owner, name='Room Hotel')

    client = APIClient()
    client.force_authenticate(user=other)

    response = client.post(
        '/api/v1/listings/rooms/',
        {
            'hotel_id': hotel.id,
            'name': 'Unauthorized Room',
            'category': 'standard',
            'description': 'Unauthorized attempt',
            'short_description': 'Unauthorized attempt',
            'base_price': '5000.00',
            'currency': 'KES',
            'max_occupancy': 2,
            'max_adults': 2,
            'max_children': 0,
        },
        format='json',
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_room_type_owner_delete_is_soft_delete(user_model):
    owner = _create_user(user_model, 'room_owner2', 'roomowner2@example.com')
    hotel = _create_hotel(owner, name='Room Hotel Owner')
    room = RoomType.objects.create(
        hotel=hotel,
        name='Suite',
        category='suite',
        base_price=Decimal('9000.00'),
        max_occupancy=2,
        max_adults=2,
        max_children=0,
    )

    client = APIClient()
    client.force_authenticate(user=owner)

    response = client.delete(f'/api/v1/listings/rooms/{room.id}/')
    assert response.status_code == 204
    room.refresh_from_db()
    assert room.is_active is False
