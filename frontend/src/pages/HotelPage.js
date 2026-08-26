import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  HeartIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  HomeIcon,
  SparklesIcon,
  CalendarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import api, { bookingsAPI, getApiErrorDetails } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useFavorites } from '../contexts/FavoritesContext';

const HotelPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isHotelFavorite, isHotelFavoriteBusy, toggleHotelFavorite } = useFavorites();
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [isBooking, setIsBooking] = useState(false);
  const hotelId = Number(id);
  const isFavorite = isHotelFavorite(hotelId);
  const isFavoriteLoading = isHotelFavoriteBusy(hotelId);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        setLoading(true);
        const [hotelResponse, roomsResponse] = await Promise.all([
          api.get(`/listings/hotels/${id}/`),
          api.get(`/listings/hotels/${id}/rooms/`)
        ]);
        setHotel(hotelResponse.data);
        const rooms = roomsResponse.data?.results || roomsResponse.data || [];
        setRoomTypes(rooms);
        if (rooms.length > 0) {
          setSelectedRoomType(rooms[0].id);
        }
      } catch (err) {
        setError('Failed to load hotel details');
        console.error('Error fetching hotel:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchHotel();
    }
  }, [id]);

  const handleImageNavigation = (direction) => {
    if (!hotel?.images?.length) return;
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => 
        prev === hotel.images.length - 1 ? 0 : prev + 1
      );
    } else {
      setCurrentImageIndex((prev) => 
        prev === 0 ? hotel.images.length - 1 : prev - 1
      );
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/hotel/${id}` } } });
      return;
    }

    try {
      const hotelId = Number(id);
      const result = await toggleHotelFavorite(hotelId);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      console.error('Failed to update favorite:', err);
      const message = err?.response?.data?.detail || 'Failed to update favorite. Please try again.';
      toast.error(message);
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
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleBookNow = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/hotel/${id}` } } });
      return;
    }

    if (!selectedRoomType) {
      toast.error('Please select a room type');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    if (numAdults < 1) {
      toast.error('Please specify at least 1 adult');
      return;
    }

    setIsBooking(true);
    try {
      const guestFullName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user?.email || 'Guest';
      
      const bookingData = {
        room_type_id: selectedRoomType,
        check_in: checkIn,
        check_out: checkOut,
        num_adults: numAdults,
        num_children: numChildren,
        guest_full_name: guestFullName,
        guest_email: user?.email || '',
        guest_phone: user?.phone_number || '',
        special_requests: '',
      };

      const booking = await bookingsAPI.createBooking(bookingData);
      toast.success("Reservation requested! We've notified the host — you'll be prompted to pay once they confirm availability.");
      navigate(`/booking/${booking.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      const { fullMessage } = getApiErrorDetails(error, 'Failed to create booking. Please try again.');
      toast.error(fullMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarSolidIcon
        key={index}
        className={`w-5 h-5 ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getPropertyTypeDisplay = (propertyType) => {
    const typeMap = {
      'hotel': 'Hotel',
      'resort': 'Resort',
      'boutique_hotel': 'Boutique Hotel',
      'business_hotel': 'Business Hotel',
      'luxury_hotel': 'Luxury Hotel',
      'budget_hotel': 'Budget Hotel',
      'bed_and_breakfast': 'Bed & Breakfast',
      'hostel': 'Hostel',
      'apartment': 'Apartment',
      'villa': 'Villa'
    };
    return typeMap[propertyType] || propertyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderAmenities = (amenities) => {
    if (!amenities?.length) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {amenities.map((mapping) => (
          <div key={mapping.id} className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm text-gray-700">{mapping.amenity.name}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HomeIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The hotel you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const primaryImage = hotel.images?.find(img => img.is_primary) || hotel.images?.[0];
  const currentImage = hotel.images?.[currentImageIndex] || primaryImage;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        {currentImage ? (
          <img
            src={currentImage.image}
            alt={currentImage.caption || hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <HomeIcon className="w-24 h-24 text-gray-400" />
          </div>
        )}

        {/* Image Navigation */}
        {hotel.images?.length > 1 && (
          <>
            <button
              onClick={() => handleImageNavigation('prev')}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleImageNavigation('next')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image Indicators */}
        {hotel.images?.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {hotel.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={handleFavoriteToggle}
            disabled={isFavoriteLoading}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${
              isFavorite 
                ? 'bg-red-600 text-white' 
                : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon className="w-6 h-6" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 transition-all"
          >
            <ShareIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 transition-all"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Hotel Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hotel Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{hotel.name}</h1>
                <div className="flex items-center space-x-2">
                  {renderStars(hotel.star_rating)}
                  <span className="text-sm text-gray-600">({hotel.star_rating} stars)</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPinIcon className="w-5 h-5" />
                  <span>{hotel.full_address}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Verified</span>
                </div>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed">
                {hotel.description}
              </p>
            </div>

            {/* Amenities */}
            {hotel.amenity_mappings?.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
                {renderAmenities(hotel.amenity_mappings)}
              </div>
            )}

            {/* Photo Gallery */}
            {hotel.images?.length > 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Photo Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {hotel.images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={image.image}
                        alt={image.caption || hotel.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {hotel.phone && (
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{hotel.phone}</span>
                  </div>
                )}
                {hotel.email && (
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{hotel.email}</span>
                  </div>
                )}
                {hotel.website && (
                  <div className="flex items-center space-x-3">
                    <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                    <a
                      href={hotel.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-medium">{getPropertyTypeDisplay(hotel.property_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Rating:</span>
                  <div className="flex items-center space-x-1">
                    {renderStars(hotel.star_rating)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Available</span>
                </div>
              </div>
            </div>

            {/* Booking Widget */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Your Stay</h3>
              
              {/* Room Type Selection */}
              {roomTypes.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Room Type
                  </label>
                  <select
                    value={selectedRoomType || ''}
                    onChange={(e) => setSelectedRoomType(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {roomTypes.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} - KSh {room.base_price?.toLocaleString()}/night
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="hotel-booking-checkin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    data-testid="hotel-booking-checkout"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Guest Count */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adults
                  </label>
                  <div className="relative">
                    <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={numAdults}
                      onChange={(e) => setNumAdults(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Children
                  </label>
                  <input
                    type="number"
                    value={numChildren}
                    onChange={(e) => setNumChildren(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBookNow}
                disabled={isBooking || !selectedRoomType}
                data-testid="hotel-booking-submit"
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <CalendarIcon className="w-5 h-5" />
                <span>{isBooking ? 'Processing...' : 'Request Reservation'}</span>
              </button>

              <p className="mt-4 text-sm text-gray-500 text-center">
                You will choose to pay now or pay at hotel on the next page.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HotelPage;
