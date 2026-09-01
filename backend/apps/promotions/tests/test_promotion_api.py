from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.listings.models import Hotel
from apps.promotions.models import Promotion

User = get_user_model()


def _create_user(username, email):
    return User.objects.create_user(
        username=username, email=email, password='testpass123',
        first_name='Test', last_name='User',
    )


def _create_hotel(host, name='Host Hotel'):
    return Hotel.objects.create(
        host=host, name=name, description='desc', short_description='short',
        star_rating=3, address='Wote', city='Wote', country='Kenya',
    )


def _promo_payload(hotel_id, **overrides):
    now = timezone.now()
    payload = {
        'hotel_id': hotel_id,
        'promotion_type': 'trending',
        'title': 'Weekend Special',
        'description': '20% off weekend stays',
        'original_price': '10000.00',
        'discounted_price': '8000.00',
        'discount_percentage': 20,
        'currency': 'KES',
        'start_date': now.isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'status': 'active',
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_host_can_create_promotion_for_own_hotel():
    host = _create_user('promo_host', 'promo_host@example.com')
    hotel = _create_hotel(host)

    client = APIClient()
    client.force_authenticate(user=host)
    response = client.post('/api/v1/promotions/', _promo_payload(hotel.id), format='json')

    assert response.status_code == 201, response.data
    promo = Promotion.objects.get(hotel=hotel)
    assert promo.provider == host


@pytest.mark.django_db
def test_host_cannot_create_promotion_for_someone_elses_hotel():
    owner = _create_user('promo_owner', 'promo_owner@example.com')
    other_host = _create_user('promo_other', 'promo_other@example.com')
    hotel = _create_hotel(owner)

    client = APIClient()
    client.force_authenticate(user=other_host)
    response = client.post('/api/v1/promotions/', _promo_payload(hotel.id), format='json')

    assert response.status_code == 403
    assert not Promotion.objects.filter(hotel=hotel).exists()


@pytest.mark.django_db
def test_cannot_edit_someone_elses_promotion():
    owner = _create_user('promo_owner2', 'promo_owner2@example.com')
    other_host = _create_user('promo_other2', 'promo_other2@example.com')
    hotel = _create_hotel(owner)

    client = APIClient()
    client.force_authenticate(user=owner)
    create_resp = client.post('/api/v1/promotions/', _promo_payload(hotel.id), format='json')
    promo_id = create_resp.data['id']

    client.force_authenticate(user=other_host)
    patch_resp = client.patch(f'/api/v1/promotions/{promo_id}/', {'title': 'Hijacked'}, format='json')
    assert patch_resp.status_code == 404


@pytest.mark.django_db
def test_promotion_detail_is_publicly_viewable():
    owner = _create_user('promo_owner3', 'promo_owner3@example.com')
    other_user = _create_user('promo_viewer', 'promo_viewer@example.com')
    hotel = _create_hotel(owner)

    client = APIClient()
    client.force_authenticate(user=owner)
    create_resp = client.post('/api/v1/promotions/', _promo_payload(hotel.id), format='json')
    promo_id = create_resp.data['id']

    # A different authenticated (non-owner) user can still view it
    client.force_authenticate(user=other_user)
    get_resp = client.get(f'/api/v1/promotions/{promo_id}/')
    assert get_resp.status_code == 200

    # And so can a logged-out visitor
    anon_client = APIClient()
    anon_resp = anon_client.get(f'/api/v1/promotions/{promo_id}/')
    assert anon_resp.status_code == 200


@pytest.mark.django_db
def test_list_serializer_includes_fields_needed_to_edit():
    # The host management UI populates its edit form from the list
    # response (no separate "my promotions" endpoint) -- if status/dates/
    # description are missing here, editing silently blanks them out.
    host = _create_user('promo_host3', 'promo_host3@example.com')
    hotel = _create_hotel(host)

    client = APIClient()
    client.force_authenticate(user=host)
    client.post('/api/v1/promotions/', _promo_payload(hotel.id), format='json')

    list_resp = client.get('/api/v1/promotions/', {'provider': host.id})
    assert list_resp.status_code == 200
    promo_data = list_resp.data['results'][0]
    assert promo_data['status'] == 'active'
    assert promo_data['description']
    assert promo_data['start_date']
    assert promo_data['end_date']


@pytest.mark.django_db
def test_active_promotions_endpoint_filters_by_type_and_window():
    host = _create_user('promo_host2', 'promo_host2@example.com')
    hotel = _create_hotel(host)
    now = timezone.now()

    Promotion.objects.create(
        provider=host, hotel=hotel, promotion_type='trending', title='Active Trending',
        description='d', original_price=Decimal('1000'), discounted_price=Decimal('800'),
        discount_percentage=20, start_date=now - timedelta(days=1), end_date=now + timedelta(days=1),
        status='active',
    )
    Promotion.objects.create(
        provider=host, hotel=hotel, promotion_type='last_minute', title='Wrong Type',
        description='d', original_price=Decimal('1000'), discounted_price=Decimal('800'),
        discount_percentage=20, start_date=now - timedelta(days=1), end_date=now + timedelta(days=1),
        status='active',
    )
    Promotion.objects.create(
        provider=host, hotel=hotel, promotion_type='trending', title='Expired',
        description='d', original_price=Decimal('1000'), discounted_price=Decimal('800'),
        discount_percentage=20, start_date=now - timedelta(days=10), end_date=now - timedelta(days=5),
        status='active',
    )
    Promotion.objects.create(
        provider=host, hotel=hotel, promotion_type='trending', title='Draft',
        description='d', original_price=Decimal('1000'), discounted_price=Decimal('800'),
        discount_percentage=20, start_date=now - timedelta(days=1), end_date=now + timedelta(days=1),
        status='draft',
    )

    client = APIClient()
    response = client.get('/api/v1/promotions/active/trending/')

    assert response.status_code == 200
    titles = [p['title'] for p in response.data]
    assert titles == ['Active Trending']
