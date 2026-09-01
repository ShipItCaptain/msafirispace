import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.notifications.models import Notification


def _create_user(username, email):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username=username, email=email, password='testpass123',
        first_name='Test', last_name='User',
    )


@pytest.mark.django_db
def test_user_only_sees_their_own_notifications():
    user = _create_user('notif_user', 'notif_user@example.com')
    other = _create_user('notif_other', 'notif_other@example.com')
    Notification.objects.create(user=user, title='Mine', message='hi')
    Notification.objects.create(user=other, title='Not mine', message='hi')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/notifications/')

    assert response.status_code == 200
    titles = [n['title'] for n in response.data['results']]
    assert titles == ['Mine']


@pytest.mark.django_db
def test_filter_by_unread():
    user = _create_user('notif_user2', 'notif_user2@example.com')
    Notification.objects.create(user=user, title='Unread', is_read=False)
    Notification.objects.create(user=user, title='Read', is_read=True)

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get('/api/v1/notifications/', {'is_read': 'false'})

    assert response.status_code == 200
    assert response.data['count'] == 1
    assert response.data['results'][0]['title'] == 'Unread'


@pytest.mark.django_db
def test_mark_single_notification_read():
    user = _create_user('notif_user3', 'notif_user3@example.com')
    notification = Notification.objects.create(user=user, title='Ping', is_read=False)

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.patch(f'/api/v1/notifications/{notification.id}/read/')

    assert response.status_code == 200
    notification.refresh_from_db()
    assert notification.is_read is True
    assert notification.read_at is not None


@pytest.mark.django_db
def test_cannot_mark_someone_elses_notification_read():
    owner = _create_user('notif_owner', 'notif_owner@example.com')
    other = _create_user('notif_intruder', 'notif_intruder@example.com')
    notification = Notification.objects.create(user=owner, title='Private', is_read=False)

    client = APIClient()
    client.force_authenticate(user=other)
    response = client.patch(f'/api/v1/notifications/{notification.id}/read/')

    assert response.status_code == 404
    notification.refresh_from_db()
    assert notification.is_read is False


@pytest.mark.django_db
def test_mark_all_read():
    user = _create_user('notif_user4', 'notif_user4@example.com')
    Notification.objects.create(user=user, title='One', is_read=False)
    Notification.objects.create(user=user, title='Two', is_read=False)

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/notifications/mark-all-read/')

    assert response.status_code == 200
    assert Notification.objects.filter(user=user, is_read=False).count() == 0
