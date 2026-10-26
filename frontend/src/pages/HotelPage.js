import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
  ChevronLeftIcon,
  HeartIcon,
  HomeIcon,
  MapPinIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../contexts/FavoritesContext';
import RoomTypesBookingTable from '../components/hotel/RoomTypesBookingTable';
import ImageLightbox from '../components/common/ImageLightbox';
import { getAmenityIcon } from '../utils/amenityIcons';

const getPropertyTypeDisplay = (propertyType) => {
  const typeMap = {
    hotel: 'Hotel',
    resort: 'Resort',
    boutique_hotel: 'Boutique Hotel',
    business_hotel: 'Business Hotel',
    luxury_hotel: 'Luxury Hotel',
    budget_hotel: 'Budget Hotel',
    bed_and_breakfast: 'Bed & Breakfast',
    hostel: 'Hostel',
    apartment: 'Apartment',
    villa: 'Villa',
  };
  if (!propertyType) return 'Hotel';
  return typeMap[propertyType] || propertyType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const HotelPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isHotelFavorite, isHotelFavoriteBusy, toggleHotelFavorite } = useFavorites();
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [hotelLightboxOpen, setHotelLightboxOpen] = useState(false);
  const [hotelLightboxIndex, setHotelLightboxIndex] = useState(0);
  const hotelId = Number(id);
  const isFavorite = isHotelFavorite(hotelId);
  const isFavoriteLoading = isHotelFavoriteBusy(hotelId);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        setLoading(true);
        const [hotelResponse, roomsResponse] = await Promise.all([
          api.get(`/listings/hotels/${id}/`),
          api.get(`/listings/hotels/${id}/rooms/`),
        ]);
        setHotel(hotelResponse.data);
        const rooms = roomsResponse.data?.results || roomsResponse.data || [];
        setRoomTypes(rooms);
      } catch (err) {
        setError('Failed to load hotel details');
        console.error('Error fetching hotel:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchHotel();
  }, [id]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/hotel/${id}` } } });
      return;
    }
    try {
      const result = await toggleHotelFavorite(Number(id));
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update favorite. Please try again.');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: hotel?.name,
        text: hotel?.short_description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-4" aria-busy="true">
          <div className="h-64 sm:h-96 bg-gray-200" />
          <div className="h-8 w-64 bg-gray-200" />
          <div className="h-40 bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <HomeIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel not found</h2>
          <p className="text-gray-600 mb-6">{error || 'This place may have been removed.'}</p>
          <button
            type="button"
            onClick={() => navigate('/hotels')}
            className="px-5 py-2.5 bg-red-600 text-white font-semibold hover:bg-red-700"
          >
            Browse hotels
          </button>
        </div>
      </div>
    );
  }

  const galleryImages = hotel.images || [];
  const placeLine = [hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.full_address;
  const aboutText = hotel.description || hotel.short_description || '';
  const aboutPreview =
    aboutText.length > 220 && !aboutOpen ? `${aboutText.slice(0, 220).trim()}…` : aboutText;
  const checkInLabel = formatTime(hotel.check_in_time);
  const checkOutLabel = formatTime(hotel.check_out_time);
  const highlights = [getPropertyTypeDisplay(hotel.property_type)].filter(Boolean);

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-10 pt-14 lg:pt-20">
      <SEO title={hotel.name} description={aboutText || placeLine} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-red-600"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              aria-label="Share"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleFavoriteToggle}
              disabled={isFavoriteLoading}
              className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <HeartSolidIcon className="w-5 h-5 text-red-600" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Gallery */}
        {galleryImages.length > 0 ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2 h-56 sm:h-[420px]">
              <button
                type="button"
                onClick={() => {
                  setHotelLightboxIndex(0);
                  setHotelLightboxOpen(true);
                }}
                className="sm:w-3/5 h-full overflow-hidden hover:opacity-95"
              >
                <img
                  src={galleryImages[0].image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
              {(galleryImages[1] || galleryImages[2]) && (
                <div className="sm:w-2/5 flex flex-row sm:flex-col gap-2 h-28 sm:h-full">
                  {galleryImages[1] && (
                    <button
                      type="button"
                      onClick={() => {
                        setHotelLightboxIndex(1);
                        setHotelLightboxOpen(true);
                      }}
                      className="flex-1 overflow-hidden hover:opacity-95"
                    >
                      <img src={galleryImages[1].image} alt="" className="w-full h-full object-cover" />
                    </button>
                  )}
                  {galleryImages[2] && (
                    <button
                      type="button"
                      onClick={() => {
                        setHotelLightboxIndex(2);
                        setHotelLightboxOpen(true);
                      }}
                      className="relative flex-1 overflow-hidden hover:opacity-95"
                    >
                      <img src={galleryImages[2].image} alt="" className="w-full h-full object-cover" />
                      {galleryImages.length > 3 && (
                        <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-semibold">
                          Show all photos
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 h-56 sm:h-80 bg-gray-100 flex items-center justify-center">
            <HomeIcon className="w-14 h-14 text-gray-300" />
          </div>
        )}

        {/* Phase 1 — place-first identity */}
        <header className="mb-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{hotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            {hotel.star_rating > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                <StarSolidIcon className="w-4 h-4 text-gray-900" />
                {Number(hotel.star_rating).toFixed(1)}
                {hotel.review_count != null && (
                  <span className="text-gray-500 font-normal">({hotel.review_count})</span>
                )}
              </span>
            )}
            {placeLine && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="w-4 h-4" />
                {placeLine}
              </span>
            )}
          </div>
          {highlights.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">{highlights.join(' · ')}</p>
          )}
        </header>

        <div className="space-y-10">
          {/* About */}
          {aboutText && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{aboutPreview}</p>
              {aboutText.length > 220 && (
                <button
                  type="button"
                  onClick={() => setAboutOpen((o) => !o)}
                  className="mt-2 text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-red-600"
                >
                  {aboutOpen ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>
          )}

          {/* Rooms + trip bar */}
          <RoomTypesBookingTable
            hotelId={hotelId}
            roomTypes={roomTypes}
            isAuthenticated={isAuthenticated}
            user={user}
            navigate={navigate}
          />

          {/* Phase 4 — amenities */}
          {hotel.amenity_mappings?.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {hotel.amenity_mappings.map((mapping) => {
                  const Icon = getAmenityIcon(mapping.amenity.name);
                  return (
                    <div key={mapping.id} className="flex items-center gap-2.5">
                      <Icon size={18} stroke={1.75} className="text-gray-700 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{mapping.amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Location */}
          {(hotel.latitude || hotel.full_address) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
              {hotel.full_address && (
                <p className="text-sm text-gray-600 mb-3">{hotel.full_address}</p>
              )}
              {hotel.latitude && hotel.longitude && (
                <div className="overflow-hidden border border-gray-200 h-56 sm:h-72">
                  <iframe
                    title={`Map showing ${hotel.name}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15&output=embed`}
                  />
                </div>
              )}
            </section>
          )}

          {/* House rules / policies — demoted from sidebar */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">House rules</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Check-in</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{checkInLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Check-out</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{checkOutLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Maximum stay</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {hotel.maximum_nights ? `${hotel.maximum_nights} nights` : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Quiet contact disclosure */}
          {(hotel.phone || hotel.email || hotel.website) && (
            <section className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setContactOpen((o) => !o)}
                className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-red-600"
              >
                {contactOpen ? 'Hide contact' : 'Contact property'}
              </button>
              {contactOpen && (
                <div className="mt-3 space-y-1.5 text-sm text-gray-700">
                  {hotel.phone && <p>{hotel.phone}</p>}
                  {hotel.email && <p>{hotel.email}</p>}
                  {hotel.website && (
                    <a
                      href={hotel.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <ImageLightbox
        images={galleryImages}
        initialIndex={hotelLightboxIndex}
        isOpen={hotelLightboxOpen}
        onClose={() => setHotelLightboxOpen(false)}
        title={hotel.name}
      />
    </div>
  );
};

export default HotelPage;
