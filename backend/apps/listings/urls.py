from django.urls import path
from . import views

app_name = 'listings'

urlpatterns = [
    # Hotel URLs
    path('hotels/', views.HotelListCreateView.as_view(), name='hotel-list-create'),
    path('hotels/<int:pk>/', views.HotelDetailView.as_view(), name='hotel-detail'),
    path('hotels/<int:hotel_id>/images/', views.HotelImageListCreateView.as_view(), name='hotel-image-list-create'),
    path('hotels/<int:hotel_id>/images/<int:pk>/', views.HotelImageDetailView.as_view(), name='hotel-image-detail'),
    path('hotels/<int:hotel_id>/amenities/', views.HotelAmenityMappingListCreateView.as_view(), name='hotel-amenity-mapping-list-create'),
    path('hotels/<int:hotel_id>/amenities/<int:pk>/', views.HotelAmenityMappingDetailView.as_view(), name='hotel-amenity-mapping-detail'),
    path('my-listings/', views.MyHotelListingsView.as_view(), name='my-hotel-listings'),
    # Favorites
    path('favorites/', views.FavoriteListCreateView.as_view(), name='favorite-list-create'),
    path('favorites/<int:hotel_id>/', views.FavoriteDeleteView.as_view(), name='favorite-delete'),
    path('favorites/bnb/', views.BnBFavoriteListCreateView.as_view(), name='bnb-favorite-list-create'),
    path('favorites/bnb/<int:bnb_listing_id>/', views.BnBFavoriteDeleteView.as_view(), name='bnb-favorite-delete'),
    path('favorites/combined/', views.CombinedFavoriteListView.as_view(), name='favorite-combined-list'),
    path('hotels/featured/', views.featured_hotels, name='featured-hotels'),
    path('hotels/search/', views.search_hotels, name='search-hotels'),
    
    # Hotel Room Types URLs
    path('hotels/<int:hotel_id>/rooms/', views.HotelRoomTypesView.as_view(), name='hotel-room-types'),
    
    # Room Type URLs
    path('rooms/', views.RoomTypeListCreateView.as_view(), name='room-type-list-create'),
    path('rooms/<int:pk>/', views.RoomTypeDetailView.as_view(), name='room-type-detail'),
    path('rooms/<int:room_type_id>/images/', views.RoomImageListCreateView.as_view(), name='room-image-list-create'),
    path('rooms/<int:room_type_id>/images/<int:pk>/', views.RoomImageDetailView.as_view(), name='room-image-detail'),
    path('rooms/<int:room_type_id>/availability/', views.room_availability, name='room-availability'),
    path('rooms/search/', views.search_available_rooms, name='search-available-rooms'),
    
    # Amenity URLs
    path('amenities/', views.HotelAmenityListView.as_view(), name='amenity-list'),
    path('room-amenities/', views.RoomAmenityListView.as_view(), name='room-amenity-list'),

    # BnB URLs
    path('bnb/', views.BnBListingListCreateView.as_view(), name='bnb-list-create'),
    path('bnb/my-listings/', views.MyBnBListingsView.as_view(), name='my-bnb-listings'),
    path('bnb/<int:pk>/', views.BnBListingDetailView.as_view(), name='bnb-detail'),
    path('bnb/<int:bnb_id>/images/', views.BnBImageListCreateView.as_view(), name='bnb-image-list-create'),
    path('bnb/<int:bnb_id>/images/<int:pk>/', views.BnBImageDetailView.as_view(), name='bnb-image-detail'),
    path('bnb/<int:bnb_id>/availability/', views.BnBAvailabilityListCreateView.as_view(), name='bnb-availability-list-create'),
    path('bnb/<int:bnb_id>/availability/<int:pk>/', views.BnBAvailabilityDetailView.as_view(), name='bnb-availability-detail'),
    path('bnb/<int:bnb_id>/availability-calendar/', views.bnb_availability, name='bnb-availability-calendar'),
    path('bnb/search/', views.search_available_bnbs, name='search-available-bnbs'),
]
