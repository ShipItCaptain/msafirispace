import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import Hotel

User = get_user_model()


def _create_hotel(host, name, **overrides):
    defaults = dict(
        host=host, name=name, description='desc', short_description='short',
        star_rating=3, address='Wote', city='Wote', country='Kenya',
        is_active=True,
    )
    defaults.update(overrides)
    return Hotel.objects.create(**defaults)


@pytest.mark.django_db
def test_featured_endpoint_backfills_with_recent_hotels_when_none_are_curated():
    # No admin has ever flagged anything is_featured/is_verified here --
    # this is the state every fresh install (and every host who just
    # created their first listing) is actually in.
    host = User.objects.create_user(username='feat_host', email='feat_host@example.com', password='testpass123')
    hotel = _create_hotel(host, 'Brand New Hotel')

    client = APIClient()
    response = client.get('/api/v1/listings/hotels/featured/')

    assert response.status_code == 200
    ids = [row['id'] for row in response.json()]
    assert hotel.id in ids


@pytest.mark.django_db
def test_featured_endpoint_prioritizes_curated_hotels_over_backfill():
    host = User.objects.create_user(username='feat_host2', email='feat_host2@example.com', password='testpass123')
    curated = _create_hotel(host, 'Curated Hotel', is_featured=True, is_verified=True)
    plain = _create_hotel(host, 'Plain New Hotel')

    client = APIClient()
    response = client.get('/api/v1/listings/hotels/featured/')

    ids = [row['id'] for row in response.json()]
    assert ids[0] == curated.id
    assert plain.id in ids


@pytest.mark.django_db
def test_featured_endpoint_excludes_inactive_hotels():
    host = User.objects.create_user(username='feat_host3', email='feat_host3@example.com', password='testpass123')
    inactive = _create_hotel(host, 'Deactivated Hotel', is_active=False)

    client = APIClient()
    response = client.get('/api/v1/listings/hotels/featured/')

    ids = [row['id'] for row in response.json()]
    assert inactive.id not in ids
