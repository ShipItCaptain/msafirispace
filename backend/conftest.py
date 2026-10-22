import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cache():
    """
    cache_page-decorated views (listings search/detail, since Day 2) are
    Redis-backed and don't participate in Django's per-test DB transaction
    rollback -- without this, a response cached by one test can leak into
    another test that happens to request the same URL (e.g. two tests
    creating a hotel that gets the same auto-increment id after rollback).
    """
    cache.clear()
    yield
    cache.clear()
