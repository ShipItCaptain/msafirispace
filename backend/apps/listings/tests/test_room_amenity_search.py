from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import Hotel, RoomAmenity, RoomAmenityMapping, RoomAvailability, RoomType

User = get_user_model()


def _make_room(hotel, name, amenities):
    room = RoomType.objects.create(
        hotel=hotel, name=name, category='standard', description='d', short_description='d',
        max_occupancy=2, max_adults=2, max_children=0, base_price=Decimal('1000.00'),
    )
    for amenity in amenities:
        RoomAmenityMapping.objects.create(room_type=room, amenity=amenity, is_available=True)
    check_in = date.today() + timedelta(days=5)
    for offset in range(2):
        RoomAvailability.objects.create(
            room_type=room, date=check_in + timedelta(days=offset),
            status=RoomAvailability.AvailabilityStatus.AVAILABLE,
            available_rooms=5, total_rooms=5,
        )
    return room, check_in


@pytest.mark.django_db
def test_room_search_amenities_requires_all_not_any():
    host = User.objects.create_user(username='amenity_host', email='amenity_host@example.com', password='testpass123')
    hotel = Hotel.objects.create(
        host=host, name='Amenity Hotel', city='Nairobi', country='Kenya',
        address='x', star_rating=3, is_active=True,
    )
    wifi = RoomAmenity.objects.create(name='WiFi')
    pool = RoomAmenity.objects.create(name='Pool')
    ac = RoomAmenity.objects.create(name='AC')

    wifi_only, check_in = _make_room(hotel, 'WiFi Only', [wifi])
    all_three, _ = _make_room(hotel, 'Full House', [wifi, pool, ac])
    check_out = check_in + timedelta(days=2)

    client = APIClient()
    client.force_authenticate(user=host)
    response = client.get('/api/v1/listings/rooms/search/', {
        'check_in': check_in.isoformat(),
        'check_out': check_out.isoformat(),
        'amenities': ['WiFi', 'Pool', 'AC'],
    })

    assert response.status_code == 200, response.data
    names = {room['name'] for room in response.data}
    assert names == {'Full House'}, names
