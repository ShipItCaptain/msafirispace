from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.listings.models import HotelAmenity


PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00\x02\x00\x01\xe2!\xbc3"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def load_sample_image():
    backend_dir = Path(__file__).resolve().parents[3]
    sample_path = backend_dir / "media" / "rooms" / "images" / "taylor-heery-8DlbPCxfGHA-unsplash.jpg"
    if sample_path.exists():
        return sample_path.read_bytes(), "image/jpeg"
    return PNG_1X1, "image/png"


@pytest.mark.django_db
def test_hotel_listing_create_rooms_images_amenities_and_visibility():
    User = get_user_model()

    host = User.objects.create_user(
        username="hotel_host_user",
        email="hotel_host@example.com",
        password="testpass123",
        user_type=User.UserType.HOST,
        host_type=User.HostType.HOTEL_RESTAURANT_HOST,
        roles=[User.Role.GUEST, User.Role.HOTEL_HOST],
        active_role=User.Role.HOTEL_HOST,
    )
    guest = User.objects.create_user(
        username="guest_user",
        email="guest@example.com",
        password="testpass123",
    )

    amenity_wifi = HotelAmenity.objects.create(name="Free WiFi", category="general")
    amenity_pool = HotelAmenity.objects.create(name="Swimming Pool", category="recreation")

    client = APIClient()
    client.force_authenticate(user=host)

    hotel_payload = {
        "name": "Msafiri Test Hotel",
        "description": "A modern test hotel for automation.",
        "short_description": "A modern test hotel.",
        "property_type": "hotel",
        "star_rating": 4,
        "address": "123 Test Avenue",
        "city": "Nairobi",
        "country": "Kenya",
        "phone": "+254700000000",
        "email": "hotel@example.com",
        "website": "https://example.test",
    }

    hotel_response = client.post("/api/v1/listings/hotels/", hotel_payload, format="json")
    assert hotel_response.status_code == 201
    hotel_id = hotel_response.json()["id"]

    # Add amenities via mapping endpoint (checkbox capture simulation)
    for amenity in (amenity_wifi, amenity_pool):
        mapping_payload = {"amenity_id": amenity.id, "is_available": True}
        mapping_response = client.post(
            f"/api/v1/listings/hotels/{hotel_id}/amenities/",
            mapping_payload,
            format="json",
        )
        assert mapping_response.status_code == 201

    mappings_response = client.get(f"/api/v1/listings/hotels/{hotel_id}/amenities/")
    assert mappings_response.status_code == 200
    assert len(mappings_response.json().get("results", [])) == 2

    # Upload hotel images (primary + secondary)
    image_bytes, image_type = load_sample_image()
    image_primary = SimpleUploadedFile("hotel_primary.jpg", image_bytes, content_type=image_type)
    image_secondary = SimpleUploadedFile("hotel_secondary.jpg", image_bytes, content_type=image_type)

    upload_primary = client.post(
        f"/api/v1/listings/hotels/{hotel_id}/images/",
        {"image": image_primary, "image_type": "exterior", "is_primary": True, "order": 0},
        format="multipart",
    )
    assert upload_primary.status_code == 201

    upload_secondary = client.post(
        f"/api/v1/listings/hotels/{hotel_id}/images/",
        {"image": image_secondary, "image_type": "lobby", "is_primary": False, "order": 1},
        format="multipart",
    )
    assert upload_secondary.status_code == 201

    # Create two room types with amenities captured as boolean fields
    room_payload_1 = {
        "hotel_id": hotel_id,
        "name": "Deluxe King",
        "category": "deluxe",
        "description": "Deluxe king room with balcony and city view.",
        "short_description": "Deluxe king room.",
        "bed_type": "king",
        "bed_count": 1,
        "max_occupancy": 2,
        "max_adults": 2,
        "max_children": 0,
        "base_price": "8500.00",
        "currency": "KES",
        "has_balcony": True,
        "has_kitchen": False,
        "has_city_view": True,
        "has_shower": True,
    }
    room_payload_2 = {
        "hotel_id": hotel_id,
        "name": "Family Suite",
        "category": "suite",
        "description": "Family suite with kitchenette and bathtub.",
        "short_description": "Family suite.",
        "bed_type": "queen",
        "bed_count": 2,
        "max_occupancy": 4,
        "max_adults": 2,
        "max_children": 2,
        "base_price": "13500.00",
        "currency": "KES",
        "has_balcony": False,
        "has_kitchen": True,
        "has_bathtub": True,
        "has_shower": True,
    }

    room_response_1 = client.post("/api/v1/listings/rooms/", room_payload_1, format="json")
    assert room_response_1.status_code == 201
    room_response_2 = client.post("/api/v1/listings/rooms/", room_payload_2, format="json")
    assert room_response_2.status_code == 201

    room_id_1 = room_response_1.json()["id"]
    room_id_2 = room_response_2.json()["id"]

    # Upload room images to confirm rendering support
    room_image = SimpleUploadedFile("room_primary.jpg", image_bytes, content_type=image_type)
    room_image_response = client.post(
        f"/api/v1/listings/rooms/{room_id_1}/images/",
        {"image": room_image, "image_type": "main", "is_primary": True, "order": 0},
        format="multipart",
    )
    assert room_image_response.status_code == 201

    # Verify room configuration persisted (checkbox -> boolean fields)
    room_detail = client.get(f"/api/v1/listings/rooms/{room_id_1}/")
    assert room_detail.status_code == 200
    room_data = room_detail.json()
    assert room_data["has_balcony"] is True
    assert room_data["has_city_view"] is True
    assert room_data["has_kitchen"] is False

    # Mark hotel as featured + verified so it appears on guest home page
    patch_response = client.patch(
        f"/api/v1/listings/hotels/{hotel_id}/",
        {"is_featured": True, "is_verified": True},
        format="json",
    )
    assert patch_response.status_code == 200

    # Host dashboard should list the hotel
    my_listings = client.get("/api/v1/listings/my-listings/")
    assert my_listings.status_code == 200
    my_listings_ids = [row["id"] for row in my_listings.json().get("results", [])]
    assert hotel_id in my_listings_ids

    # Guest home featured hotels should include the hotel and show an image
    client.force_authenticate(user=guest)
    featured = client.get("/api/v1/listings/hotels/featured/")
    assert featured.status_code == 200
    featured_ids = [row["id"] for row in featured.json()]
    assert hotel_id in featured_ids
    featured_row = next(row for row in featured.json() if row["id"] == hotel_id)
    assert featured_row["primary_image"] is not None
