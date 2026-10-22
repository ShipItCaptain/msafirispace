"""
Query-count regression test for the public listing search endpoints.

This is the thing a k6/Locust run would surface indirectly (rising latency
under load) -- checking the query count directly is more precise and doesn't
need a load-generation tool: if the number of queries scales with the number
of results, an N+1 exists and it *will* show up as latency once there's real
traffic, long before anyone notices in a load test.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient

from apps.listings.models import Hotel, HotelAmenity, HotelAmenityMapping, HotelImage

User = get_user_model()


def _make_hotels(n, amenities):
    host = User.objects.create_user(
        username=f'load_host_{n}', email=f'load_host_{n}@example.com', password='testpass123',
    )
    for i in range(n):
        hotel = Hotel.objects.create(
            host=host, name=f'Load Test Hotel {i}', description='x', city='Nairobi',
            country='Kenya', property_type='hotel', star_rating=3, is_active=True,
        )
        HotelImage.objects.create(hotel=hotel, image=f'hotels/images/test_{i}.jpg', is_primary=True)
        for amenity in amenities:
            HotelAmenityMapping.objects.create(hotel=hotel, amenity=amenity, is_available=True)


def _query_count_for_hotel_list():
    client = APIClient()
    with CaptureQueriesContext(connection) as ctx:
        response = client.get('/api/v1/listings/hotels/?page_size=50')
    assert response.status_code == 200
    return len(ctx.captured_queries), response.json()['count']


@pytest.mark.django_db
def test_hotel_search_query_count_does_not_scale_with_result_count():
    amenities = [HotelAmenity.objects.create(name=f'Load Amenity {i}') for i in range(3)]

    _make_hotels(5, amenities)
    cache.clear()  # same Day-2 cache_page(90) issue conftest.py guards against -- be explicit here too
    queries_for_5, count_5 = _query_count_for_hotel_list()

    _make_hotels(20, amenities)
    cache.clear()
    queries_for_25, count_25 = _query_count_for_hotel_list()

    assert count_25 > count_5
    # A flat (O(1)) query count is the goal; allow a little slack for
    # pagination's count() query etc., but 5x the results must not mean
    # anywhere near 5x the queries -- that's the N+1 signature.
    assert queries_for_25 <= queries_for_5 + 3, (
        f"Query count grew with result count ({queries_for_5} -> {queries_for_25} queries "
        f"for {count_5} -> {count_25} hotels) -- likely an N+1 in the list serializer."
    )
