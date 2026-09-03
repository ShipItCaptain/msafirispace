import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00\x02\x00\x01\xe2!\xbc3"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _create_user(username, email):
    User = get_user_model()
    return User.objects.create_user(
        username=username, email=email, password='testpass123',
        first_name='Test', last_name='User',
    )


def _file(name='doc.png'):
    return SimpleUploadedFile(name, PNG_1X1, content_type='image/png')


@pytest.mark.django_db
def test_onboarding_individual_bnb_creates_profile_and_completes():
    User = get_user_model()
    user = _create_user('bnb_individual', 'bnb_individual@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'individual',
        'host_category': 'bnb',
        'owner_name': 'Jane Owner',
        'owner_kra_pin': 'A123456789Z',
        'owner_id_number': '12345678',
        'owner_id_front': _file('front.png'),
        'owner_id_back': _file('back.png'),
        'contact_email': 'jane@example.com',
        'contact_phone': '+254700000000',
    }, format='multipart')

    assert response.status_code == 201, response.data
    data = response.json()
    assert data['host_category'] == 'bnb'
    assert 'host_profile' in data

    user.refresh_from_db()
    assert user.host_type == User.HostType.BNB_HOST
    assert user.user_type == User.UserType.HOST
    # Onboarding alone should NOT grant the bnb_host role -- that still only
    # happens at listing-creation time.
    assert 'bnb_host' not in user.roles

    profile = user.bnb_profile
    assert profile.account_type == 'individual'
    assert profile.owner_name == 'Jane Owner'
    assert profile.onboarding_completed_at is not None


@pytest.mark.django_db
def test_onboarding_individual_bnb_missing_required_field_rejected():
    user = _create_user('bnb_missing', 'bnb_missing@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'individual',
        'host_category': 'bnb',
        'owner_name': 'Jane Owner',
        # owner_kra_pin, owner_id_number, id photos, contact all missing
    }, format='multipart')

    assert response.status_code == 400
    assert 'owner_kra_pin' in response.data
    assert 'owner_id_front' in response.data


@pytest.mark.django_db
def test_onboarding_individual_bnb_permit_is_optional():
    user = _create_user('bnb_no_permit', 'bnb_no_permit@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'individual',
        'host_category': 'bnb',
        'owner_name': 'Jane Owner',
        'owner_kra_pin': 'A123456789Z',
        'owner_id_number': '12345678',
        'owner_id_front': _file('front.png'),
        'owner_id_back': _file('back.png'),
        'contact_email': 'jane@example.com',
        'contact_phone': '+254700000000',
    }, format='multipart')

    assert response.status_code == 201, response.data


@pytest.mark.django_db
def test_onboarding_company_bnb_requires_company_fields():
    user = _create_user('bnb_company', 'bnb_company@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'company',
        'host_category': 'bnb',
        'company_name': 'Coastal Stays Ltd',
        'company_kra_pin': 'P987654321X',
        'company_permit': _file('permit.png'),
        'contact_email': 'info@coastalstays.example.com',
        'contact_phone': '+254711222333',
    }, format='multipart')

    assert response.status_code == 201, response.data
    user.refresh_from_db()
    profile = user.bnb_profile
    assert profile.account_type == 'company'
    assert profile.company_name == 'Coastal Stays Ltd'


@pytest.mark.django_db
def test_onboarding_hotel_restaurant_always_business_style_regardless_of_account_type():
    User = get_user_model()
    user = _create_user('hotel_individual', 'hotel_individual@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    # account_type is "individual" but host_category is hotel_restaurant --
    # per spec this still requires the business-style fields.
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'individual',
        'host_category': 'hotel_restaurant',
        'company_name': 'Acacia Resort Ltd',
        'contact_email': 'info@acacia.example.com',
        'contact_phone': '+254722333444',
        'kra_pin': 'P051234567X',
        'manager_name': 'John Manager',
        'manager_contact': '+254722333445',
        'manager_role': 'manager',
        'business_permit': _file('permit.png'),
        'business_registration_certificate': _file('cert.png'),
    }, format='multipart')

    assert response.status_code == 201, response.data
    user.refresh_from_db()
    assert user.host_type == User.HostType.HOTEL_RESTAURANT_HOST
    profile = user.hotel_restaurant_profile
    assert profile.company_name == 'Acacia Resort Ltd'
    assert profile.manager_role == 'manager'
    assert profile.onboarding_completed_at is not None


@pytest.mark.django_db
def test_onboarding_hotel_restaurant_missing_field_rejected():
    user = _create_user('hotel_missing', 'hotel_missing@example.com')

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'company',
        'host_category': 'hotel_restaurant',
        'company_name': 'Acacia Resort Ltd',
        # missing contact/kra/manager/permit fields
    }, format='multipart')

    assert response.status_code == 400
    assert 'kra_pin' in response.data
    assert 'business_permit' in response.data


@pytest.mark.django_db
def test_resubmitting_onboarding_updates_the_same_profile_row():
    user = _create_user('bnb_resubmit', 'bnb_resubmit@example.com')
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        'account_type': 'individual',
        'host_category': 'bnb',
        'owner_name': 'Jane Owner',
        'owner_kra_pin': 'A123456789Z',
        'owner_id_number': '12345678',
        'owner_id_front': _file('front.png'),
        'owner_id_back': _file('back.png'),
        'contact_email': 'jane@example.com',
        'contact_phone': '+254700000000',
    }
    first = client.post('/api/v1/auth/host/onboard/', payload, format='multipart')
    assert first.status_code == 201

    payload['owner_name'] = 'Jane Renamed'
    payload['owner_id_front'] = _file('front2.png')
    payload['owner_id_back'] = _file('back2.png')
    second = client.post('/api/v1/auth/host/onboard/', payload, format='multipart')
    assert second.status_code == 201

    from apps.users.models import BnBHostProfile
    assert BnBHostProfile.objects.filter(user=user).count() == 1
    user.refresh_from_db()
    assert user.bnb_profile.owner_name == 'Jane Renamed'


@pytest.mark.django_db
def test_onboarding_status_reflects_completion():
    user = _create_user('status_check', 'status_check@example.com')
    client = APIClient()
    client.force_authenticate(user=user)

    before = client.get('/api/v1/auth/host/onboarding-status/')
    assert before.status_code == 200
    assert before.data == {'onboarding_completed': False, 'host_category': None}

    client.post('/api/v1/auth/host/onboard/', {
        'account_type': 'company',
        'host_category': 'bnb',
        'company_name': 'Coastal Stays Ltd',
        'company_kra_pin': 'P987654321X',
        'company_permit': _file('permit.png'),
        'contact_email': 'info@coastalstays.example.com',
        'contact_phone': '+254711222333',
    }, format='multipart')

    after = client.get('/api/v1/auth/host/onboarding-status/')
    assert after.status_code == 200
    assert after.data == {'onboarding_completed': True, 'host_category': 'bnb'}


@pytest.mark.django_db
def test_onboarding_status_requires_auth():
    client = APIClient()
    response = client.get('/api/v1/auth/host/onboarding-status/')
    assert response.status_code == 401
