import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_api_responses_are_never_cached():
    # Regression test: the shared-hosting web server applies its own
    # default Cache-Control (observed: max-age=90) to responses with none
    # set, letting a browser serve a stale GET for up to 90s after a
    # PATCH/POST changes the underlying data. NoCacheAPIMiddleware must
    # force no-store on every /api/ response regardless.
    client = APIClient()
    response = client.get('/api/v1/listings/hotels/')
    assert response.headers.get('Cache-Control') == 'no-store'


def test_non_api_responses_are_left_alone():
    client = APIClient()
    response = client.get('/')
    assert response.headers.get('Cache-Control') != 'no-store'
