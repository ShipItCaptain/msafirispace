from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.listings.models import BnBListing, Hotel, RoomType


def _create_host(user_model, username, email):
    return user_model.objects.create_user(
        username=username,
        email=email,
        password="testpass123",
        first_name="Host",
        last_name="User",
    )


def _create_hotel_and_room(host):
    hotel = Hotel.objects.create(
        host=host,
        name="E2E Hotel",
        description="Hotel description",
        short_description="Hotel short description",
        star_rating=3,
        address="Wote, Makueni",
        city="Wote",
        country="Kenya",
    )
    room = RoomType.objects.create(
        hotel=hotel,
        name="Standard Room",
        category="standard",
        description="Standard room",
        short_description="Standard room short description",
        max_occupancy=2,
        max_adults=2,
        max_children=0,
        base_price=Decimal("4500.00"),
        currency="KES",
    )
    return hotel, room


def _create_bnb(host):
    return BnBListing.objects.create(
        host=host,
        title="E2E BnB",
        description="BnB description",
        city="Nairobi",
        country="Kenya",
        address="Nairobi West",
        price_per_night=Decimal("2500.00"),
        currency="KES",
        max_guests=3,
        minimum_nights=1,
        maximum_nights=10,
        is_active=True,
    )


@pytest.mark.django_db
def test_guest_can_register_login_and_book_hotel_and_bnb():
    user_model = get_user_model()
    host = _create_host(user_model, "host_e2e", "host-e2e@example.com")
    hotel, room = _create_hotel_and_room(host)
    bnb = _create_bnb(host)

    public_client = APIClient()
    unique = str(date.today().toordinal())
    guest_email = f"guest-{unique}@example.com"

    register_response = public_client.post(
        "/api/v1/auth/register/",
        {
            "email": guest_email,
            "username": f"guest_{unique}",
            "first_name": "Guest",
            "last_name": "Traveler",
            "password": "testpass123",
            "password_confirm": "testpass123",
            "roles": ["guest"],
        },
        format="json",
    )
    assert register_response.status_code == 201, register_response.data

    login_response = public_client.post(
        "/api/v1/auth/login/",
        {"email": guest_email, "password": "testpass123"},
        format="json",
    )
    assert login_response.status_code == 200, login_response.data
    access_token = login_response.data["tokens"]["access"]

    guest_client = APIClient()
    guest_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    hotels_response = guest_client.get("/api/v1/listings/hotels/")
    assert hotels_response.status_code == 200
    hotels_payload = hotels_response.json()
    hotels_results = hotels_payload.get("results", hotels_payload)
    assert any(item["id"] == hotel.id for item in hotels_results)

    hotel_detail_response = guest_client.get(f"/api/v1/listings/hotels/{hotel.id}/")
    assert hotel_detail_response.status_code == 200

    check_in = date.today() + timedelta(days=5)
    check_out = check_in + timedelta(days=2)

    hotel_booking_response = guest_client.post(
        "/api/v1/bookings/",
        {
            "room_type_id": room.id,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "num_adults": 2,
            "num_children": 0,
            "guest_full_name": "Guest Traveler",
            "guest_email": guest_email,
            "guest_phone": "+254700111222",
            "payment_method": "online",
        },
        format="json",
    )
    assert hotel_booking_response.status_code == 201, hotel_booking_response.data
    assert hotel_booking_response.data["room_type"]["id"] == room.id
    assert Decimal(str(hotel_booking_response.data["total_amount"])) == Decimal("9000.00")

    bnbs_response = guest_client.get("/api/v1/listings/bnb/")
    assert bnbs_response.status_code == 200
    bnbs_payload = bnbs_response.json()
    bnbs_results = bnbs_payload.get("results", bnbs_payload)
    assert any(item["id"] == bnb.id for item in bnbs_results)

    bnb_detail_response = guest_client.get(f"/api/v1/listings/bnb/{bnb.id}/")
    assert bnb_detail_response.status_code == 200

    bnb_booking_response = guest_client.post(
        "/api/v1/bookings/",
        {
            "bnb_listing_id": bnb.id,
            "check_in": (check_out + timedelta(days=3)).isoformat(),
            "check_out": (check_out + timedelta(days=5)).isoformat(),
            "num_adults": 2,
            "num_children": 0,
            "guest_full_name": "Guest Traveler",
            "guest_email": guest_email,
            "guest_phone": "+254700111222",
            "payment_method": "online",
        },
        format="json",
    )
    assert bnb_booking_response.status_code == 201, bnb_booking_response.data
    assert bnb_booking_response.data["bnb_listing"]["id"] == bnb.id
    assert Decimal(str(bnb_booking_response.data["total_amount"])) == Decimal("5000.00")

    my_bookings_response = guest_client.get("/api/v1/bookings/my-bookings/")
    assert my_bookings_response.status_code == 200
    bookings_payload = my_bookings_response.json()
    bookings_results = bookings_payload.get("results", bookings_payload)
    assert len(bookings_results) == 2
    assert {entry["booking_type"] for entry in bookings_results} == {"hotel", "bnb"}
