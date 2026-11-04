from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.listings.models import Hotel

User = get_user_model()


def _make_admin():
    return User.objects.create_user(
        username='needs_attention_admin',
        email='needs_attention_admin@example.com',
        password='testpass123',
        admin_tier=User.AdminTier.SYSTEM,
        account_verified=True,
    )


def _make_host():
    return User.objects.create_user(
        username='needs_attention_host',
        email='needs_attention_host@example.com',
        password='testpass123',
    )


@pytest.mark.django_db
def test_stale_unverified_hotel_is_critical_fresh_one_is_normal():
    host = _make_host()

    stale = Hotel.objects.create(
        host=host, name='Stale Hotel', description='d', short_description='s',
        star_rating=3, address='a', city='Nairobi', country='Kenya',
    )
    Hotel.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(days=35))

    fresh = Hotel.objects.create(
        host=host, name='Fresh Hotel', description='d', short_description='s',
        star_rating=3, address='a', city='Nairobi', country='Kenya',
    )

    client = APIClient()
    client.force_authenticate(user=_make_admin())
    response = client.get('/api/v1/admin/dashboard/needs-attention/')

    assert response.status_code == 200
    by_title = {item['title']: item for item in response.data['items']}
    assert by_title['Stale Hotel']['urgency'] == 'critical'
    assert by_title['Fresh Hotel']['urgency'] == 'normal'
    # Stale (more urgent) must sort ahead of fresh in the flat queue.
    titles = [item['title'] for item in response.data['items']]
    assert titles.index('Stale Hotel') < titles.index('Fresh Hotel')
    assert response.data['counts']['listings'] == 2
    assert response.data['counts']['critical'] == 1
