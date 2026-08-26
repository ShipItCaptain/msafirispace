import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import Hotel
from apps.reviews.models import Review


def _create_user(username, email):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        first_name='Test',
        last_name='User',
    )


def _create_hotel(host):
    return Hotel.objects.create(
        host=host,
        name='Host Hotel',
        description='desc',
        short_description='short',
        star_rating=3,
        address='Wote',
        city='Wote',
        country='Kenya',
    )


@pytest.mark.django_db
def test_host_can_reply_to_own_listing_review():
    host = _create_user('reply_host', 'reply_host@example.com')
    traveler = _create_user('reply_traveler', 'reply_traveler@example.com')
    hotel = _create_hotel(host)
    review = Review.objects.create(
        traveler=traveler,
        hotel=hotel,
        rating=5,
        comment='Great stay',
        is_public=True,
    )

    client = APIClient()
    client.force_authenticate(user=host)
    response = client.post(
        f'/api/v1/reviews/{review.id}/reply/',
        {'reply': 'Thank you for staying with us!'},
        format='json',
    )

    assert response.status_code == 200
    review.refresh_from_db()
    assert review.host_reply == 'Thank you for staying with us!'
    assert review.host_reply_updated_at is not None


@pytest.mark.django_db
def test_host_cannot_reply_to_unowned_review():
    owner = _create_user('owner_host_review', 'owner_host_review@example.com')
    other_host = _create_user('other_host_review', 'other_host_review@example.com')
    traveler = _create_user('traveler_review', 'traveler_review@example.com')
    hotel = _create_hotel(owner)
    review = Review.objects.create(
        traveler=traveler,
        hotel=hotel,
        rating=4,
        comment='Nice place',
        is_public=True,
    )

    client = APIClient()
    client.force_authenticate(user=other_host)
    response = client.post(
        f'/api/v1/reviews/{review.id}/reply/',
        {'reply': 'Unauthorized host reply'},
        format='json',
    )

    assert response.status_code == 403
