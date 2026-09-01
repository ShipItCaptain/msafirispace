import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_create_bnb_listing_authenticated_user():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbcreator',
        email='bnbcreator@example.com',
        password='testpass123',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'title': 'Test BnB Listing',
        'city': 'Nairobi',
        'country': 'Kenya',
        'price_per_night': '5500.00',
        'bedrooms': 2,
        'bathrooms': 1,
        'max_guests': 3,
        'amenities': ['WiFi', 'Kitchen'],
        'house_rules': ['No smoking'],
    }

    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201
    data = response.json()

    assert data['title'] == payload['title']
    assert data['city'] == payload['city']
    assert data['host'] == user.id
    assert data['price_per_night'] == payload['price_per_night']

    # Creating a listing should grant the matching host role automatically —
    # otherwise host-only endpoints (e.g. the host dashboard summary) 403
    # for a user who legitimately owns a listing.
    user.refresh_from_db()
    assert 'bnb_host' in user.roles
    assert user.active_role == 'bnb_host'


@pytest.mark.django_db
def test_create_bnb_listing_does_not_override_existing_active_role():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username='bnbcreator2',
        email='bnbcreator2@example.com',
        password='testpass123',
        roles=['guest', 'hotel_host'],
        active_role='hotel_host',
    )

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'title': 'Second BnB Listing',
        'city': 'Nairobi',
        'country': 'Kenya',
        'price_per_night': '5500.00',
        'bedrooms': 2,
        'bathrooms': 1,
        'max_guests': 3,
    }
    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201

    user.refresh_from_db()
    assert 'bnb_host' in user.roles
    # A user already actively hosting elsewhere shouldn't get silently
    # switched away from that role just for adding a second listing type.
    assert user.active_role == 'hotel_host'


@pytest.mark.django_db
def test_number_of_units_defaults_to_one():
    user_model = get_user_model()
    user = user_model.objects.create_user(username='unitshost', email='unitshost@example.com', password='testpass123')

    client = APIClient()
    client.force_authenticate(user=user)
    payload = {
        'title': 'Default Units Listing', 'city': 'Nairobi', 'country': 'Kenya',
        'price_per_night': '5000.00', 'bedrooms': 1, 'bathrooms': 1, 'max_guests': 2,
    }
    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201
    assert response.json()['number_of_units'] == 1


@pytest.mark.django_db
def test_individual_owner_compliance_fields_persist_but_are_not_readable():
    from apps.listings.models import BnBListing

    user_model = get_user_model()
    user = user_model.objects.create_user(username='soloowner', email='soloowner@example.com', password='testpass123')

    client = APIClient()
    client.force_authenticate(user=user)
    payload = {
        'title': 'Solo Owner Listing', 'city': 'Nairobi', 'country': 'Kenya',
        'price_per_night': '5000.00', 'bedrooms': 1, 'bathrooms': 1, 'max_guests': 2,
        'number_of_units': 3,
        'is_company_operated': False,
        'owner_id_number': '12345678',
        'owner_kra_pin': 'A123456789Z',
        'host_phone': '+254700111222',
        'host_email': 'soloowner-contact@example.com',
    }
    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201, response.data
    body = response.json()

    # Sensitive fields must never come back in the response...
    assert 'owner_id_number' not in body
    assert 'owner_kra_pin' not in body
    # ...but they must have actually been saved server-side.
    listing = BnBListing.objects.get(pk=body['id'])
    assert listing.number_of_units == 3
    assert listing.owner_id_number == '12345678'
    assert listing.owner_kra_pin == 'A123456789Z'
    assert listing.host_phone == '+254700111222'

    # And still absent even when the owning host re-fetches the listing.
    detail = client.get(f"/api/v1/listings/bnb/{body['id']}/")
    assert 'owner_id_number' not in detail.json()
    assert 'owner_kra_pin' not in detail.json()


@pytest.mark.django_db
def test_company_operated_compliance_fields_persist_but_kra_pin_not_readable():
    from apps.listings.models import BnBListing

    user_model = get_user_model()
    user = user_model.objects.create_user(username='companyowner', email='companyowner@example.com', password='testpass123')

    client = APIClient()
    client.force_authenticate(user=user)
    payload = {
        'title': 'Company Operated Listing', 'city': 'Mombasa', 'country': 'Kenya',
        'price_per_night': '7000.00', 'bedrooms': 2, 'bathrooms': 2, 'max_guests': 4,
        'is_company_operated': True,
        'company_name': 'Coastal Stays Ltd',
        'company_kra_pin': 'P051234567X',
        'company_contact_phone': '+254711222333',
        'company_contact_email': 'info@coastalstays.example.com',
    }
    response = client.post('/api/v1/listings/bnb/', payload, format='json')
    assert response.status_code == 201, response.data
    body = response.json()

    assert body['is_company_operated'] is True
    assert body['company_name'] == 'Coastal Stays Ltd'
    assert body['company_contact_phone'] == '+254711222333'
    assert body['company_contact_email'] == 'info@coastalstays.example.com'
    assert 'company_kra_pin' not in body

    listing = BnBListing.objects.get(pk=body['id'])
    assert listing.company_kra_pin == 'P051234567X'


@pytest.mark.django_db
def test_editing_a_listing_with_blank_kra_pin_does_not_clear_the_saved_one():
    # owner_id_number/owner_kra_pin/company_kra_pin are write_only, so the
    # edit form can never pre-populate them from a GET and will submit them
    # blank on every save unless the host retypes them each time. A blank
    # value on update must not silently wipe out what was saved at creation.
    from apps.listings.models import BnBListing

    user_model = get_user_model()
    user = user_model.objects.create_user(username='editowner', email='editowner@example.com', password='testpass123')

    client = APIClient()
    client.force_authenticate(user=user)
    create_resp = client.post('/api/v1/listings/bnb/', {
        'title': 'Editable Listing', 'city': 'Nairobi', 'country': 'Kenya',
        'price_per_night': '5000.00', 'bedrooms': 1, 'bathrooms': 1, 'max_guests': 2,
        'owner_id_number': '87654321',
        'owner_kra_pin': 'A987654321Z',
    }, format='json')
    listing_id = create_resp.json()['id']

    # Simulate the edit form re-submitting the whole form with these left
    # blank (since it can never know what was previously saved).
    update_resp = client.patch(f'/api/v1/listings/bnb/{listing_id}/', {
        'title': 'Editable Listing (renamed)',
        'owner_id_number': '',
        'owner_kra_pin': '',
    }, format='json')
    assert update_resp.status_code == 200, update_resp.data

    listing = BnBListing.objects.get(pk=listing_id)
    assert listing.title == 'Editable Listing (renamed)'
    assert listing.owner_id_number == '87654321'
    assert listing.owner_kra_pin == 'A987654321Z'
