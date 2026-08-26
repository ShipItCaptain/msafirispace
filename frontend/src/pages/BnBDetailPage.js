import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  HeartIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { bnbAPI, bookingsAPI, getApiErrorDetails, reviewsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { StarIcon } from '@heroicons/react/24/solid';
import { useFavorites } from '../contexts/FavoritesContext';

const BnBDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isBnBFavorite, isBnBFavoriteBusy, toggleBnBFavorite } = useFavorites();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const listingId = Number(id);
  const isFavorite = isBnBFavorite(listingId);
  const isFavoriteLoading = isBnBFavoriteBusy(listingId);

  const formatTime = (value) => {
    if (!value || typeof value !== 'string') return '—';
    return value.length >= 5 ? value.slice(0, 5) : value;
  };

  const formatCurrency = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const data = await bnbAPI.getListing(parseInt(id));
        setListing(data);
      } catch (err) {
        setError('Failed to load BnB listing details');
        console.error('Error fetching BnB listing:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        setLoadingReviews(true);
        const [reviewsData, statsData] = await Promise.all([
          reviewsAPI.getBnBReviews(parseInt(id)),
          reviewsAPI.getBnBReviewStats(parseInt(id))
        ]);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setReviewStats(statsData);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (id) {
      fetchReviews();
    }
  }, [id]);

  const handleImageNavigation = (direction) => {
    const imageCount = imageUrls.length;
    if (!imageCount) return;

    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1));
    } else {
      setCurrentImageIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1));
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/bnb/${id}` } } });
      return;
    }

    try {
      const listingId = Number(id);
      const result = await toggleBnBFavorite(listingId);
      if (!result.ok) {
        toast.error(result.errorMessage);
        return;
      }
      toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      console.error('Failed to update BnB favorite:', err);
      const message = err?.response?.data?.detail || 'Failed to update favorite. Please try again.';
      toast.error(message);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: listing?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const scrollToBookingCard = () => {
    const bookingCard = document.getElementById('booking-card');
    if (bookingCard) {
      bookingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBookNow = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/bnb/${id}` } } });
      return;
    }

    // Validate dates
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    if (guests < 1) {
      toast.error('Please specify at least 1 guest');
      return;
    }

    if (listing?.max_guests && guests > Number(listing.max_guests)) {
      toast.error(`This listing allows up to ${listing.max_guests} guest(s)`);
      return;
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (listing?.minimum_nights && nights < Number(listing.minimum_nights)) {
      toast.error(`Minimum stay is ${listing.minimum_nights} night(s)`);
      return;
    }
    if (listing?.maximum_nights && nights > Number(listing.maximum_nights)) {
      toast.error(`Maximum stay is ${listing.maximum_nights} night(s)`);
      return;
    }

    try {
      setIsBooking(true);
      // Create booking
      const guestFullName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user?.email || 'Guest';
      
      const bookingData = {
        bnb_listing_id: parseInt(id),
        check_in: checkIn,
        check_out: checkOut,
        num_adults: guests,
        num_children: 0,
        guest_full_name: guestFullName,
        guest_email: user?.email || '',
        guest_phone: user?.phone_number || '',
        special_requests: '',
        payment_method: 'online'
      };

      const booking = await bookingsAPI.createBooking(bookingData);
      toast.success('Booking created successfully!');
      
      // Navigate to booking detail page
      navigate(`/booking/${booking.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      const { fullMessage } = getApiErrorDetails(error, 'Failed to create booking. Please try again.');
      toast.error(fullMessage);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BnB details...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">BnB Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The BnB listing you are looking for does not exist.'}</p>
          <Link
            to="/bnbs"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to BnBs
          </Link>
        </div>
      </div>
    );
  }

  const imageUrls = [
    ...(listing.primary_image ? [listing.primary_image] : []),
    ...((listing.images || []).map((image) => (
      typeof image === 'string' ? image : image?.image
    )).filter(Boolean)),
  ].filter((value, index, array) => array.indexOf(value) === index);

  const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="34">No image available</text></svg>';
  const currentImage = imageUrls[currentImageIndex] || fallbackImage;
  const amenities = Array.isArray(listing.amenities) ? listing.amenities : [];
  const houseRules = Array.isArray(listing.house_rules) ? listing.house_rules : [];
  const amenityPreview = amenities.slice(0, 10);
  const extraAmenityCount = Math.max(0, amenities.length - amenityPreview.length);
  const displayedAmenities = showAllAmenities ? amenities : amenityPreview;
  const rulesPreview = houseRules.slice(0, 4);
  const displayedRules = showAllRules ? houseRules : rulesPreview;
  const extraRulesCount = Math.max(0, houseRules.length - rulesPreview.length);
  const policyItems = [
    { label: 'Smoking', allowed: Boolean(listing.smoking_allowed) },
    { label: 'Pets', allowed: Boolean(listing.pets_allowed) },
    { label: 'Parties', allowed: Boolean(listing.parties_allowed) },
    { label: 'Children', allowed: Boolean(listing.children_allowed) },
  ];
  const nightlyPrice = Number(listing.price_per_night || 0);
  const cleaningFee = Number(listing.cleaning_fee || 0);
  const securityDeposit = Number(listing.security_deposit || 0);
  const maxGuests = Number(listing.max_guests || 0);
  const minNights = Number(listing.minimum_nights || 1);
  const maxNights = Number(listing.maximum_nights || 30);

  const hasDates = Boolean(checkIn && checkOut);
  const parsedCheckIn = hasDates ? new Date(checkIn) : null;
  const parsedCheckOut = hasDates ? new Date(checkOut) : null;
  const nights = hasDates && parsedCheckIn && parsedCheckOut
    ? Math.ceil((parsedCheckOut - parsedCheckIn) / (1000 * 60 * 60 * 24))
    : 0;
  const isDateRangeValid = nights > 0;
  const exceedsGuests = maxGuests > 0 && guests > maxGuests;
  const belowMinNights = isDateRangeValid && nights < minNights;
  const aboveMaxNights = isDateRangeValid && nights > maxNights;

  const serviceFee = isDateRangeValid ? Math.round(nightlyPrice * nights * 0.08) : 0;
  const accommodationTotal = isDateRangeValid ? nightlyPrice * nights : 0;
  const estimatedTotal = accommodationTotal + cleaningFee + serviceFee;
  const canSubmitBooking = Boolean(
    checkIn &&
    checkOut &&
    isDateRangeValid &&
    !exceedsGuests &&
    !belowMinNights &&
    !aboveMaxNights
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/bnbs')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to BnBs
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
              <div className="flex items-center text-gray-600">
                <MapPinIcon className="w-5 h-5 mr-1" />
                <span>{listing.city}, {listing.country}</span>
                {listing.address && (
                  <span className="ml-2">• {listing.address}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3 ml-4">
              <button
                onClick={handleFavoriteToggle}
                disabled={isFavoriteLoading}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HeartIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Share"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Image Gallery */}
        {imageUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mb-8 rounded-xl overflow-hidden bg-gray-200"
          >
            <div className="relative h-96">
              <img
                src={currentImage}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackImage;
                }}
              />
              
              {imageUrls.length > 1 && (
                <>
                  <button
                    onClick={() => handleImageNavigation('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleImageNavigation('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'w-8 bg-white' 
                            : 'w-2 bg-white/50'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Mobile Quick Reserve Bar */}
        <div className="lg:hidden sticky top-20 z-20 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">From</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(nightlyPrice)}<span className="text-xs font-medium text-gray-500"> / night</span></p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16">
                  <input
                    type="number"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value, 10) || 1)}
                    min="1"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-center"
                    aria-label="Guests"
                  />
                </div>
                <button
                  type="button"
                  onClick={scrollToBookingCard}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            {listing.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-5 sm:p-6"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">About this place</h2>
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {listing.description}
                </p>
              </motion.div>
            )}

            {/* Listing Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Listing Highlights</h2>
                <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  {listing.property_type || 'bnb'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Bedrooms</p>
                  <p className="font-semibold text-gray-900">{listing.bedrooms ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Bathrooms</p>
                  <p className="font-semibold text-gray-900">{listing.bathrooms ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Beds</p>
                  <p className="font-semibold text-gray-900">{listing.beds ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Guests</p>
                  <p className="font-semibold text-gray-900">{listing.max_guests ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Min nights</p>
                  <p className="font-semibold text-gray-900">{listing.minimum_nights ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Max nights</p>
                  <p className="font-semibold text-gray-900">{listing.maximum_nights ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="font-semibold text-gray-900">{formatTime(listing.check_in_time)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="font-semibold text-gray-900">{formatTime(listing.check_out_time)}</p>
                </div>
              </div>

              {amenities.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayedAmenities.map((amenity) => (
                      <span key={amenity} className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        {amenity}
                      </span>
                    ))}
                    {!showAllAmenities && extraAmenityCount > 0 && (
                      <span className="px-3 py-1 text-sm rounded-full bg-red-50 text-red-700 border border-red-100">
                        +{extraAmenityCount} more
                      </span>
                    )}
                  </div>
                  {amenities.length > amenityPreview.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllAmenities((prev) => !prev)}
                      className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      {showAllAmenities ? 'Show fewer amenities' : `Show all amenities (${amenities.length})`}
                    </button>
                  )}
                </div>
              )}

              {(houseRules.length > 0 || listing.smoking_allowed !== undefined || listing.pets_allowed !== undefined || listing.parties_allowed !== undefined || listing.children_allowed !== undefined) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">House Rules</h3>
                {houseRules.length > 0 && (
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 mb-3">
                    {displayedRules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                )}
                  {houseRules.length > rulesPreview.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllRules((prev) => !prev)}
                      className="mb-3 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      {showAllRules ? 'Show fewer house rules' : `Show all house rules (${houseRules.length})`}
                    </button>
                  )}
                  {!showAllRules && extraRulesCount > 0 && (
                    <p className="mb-3 text-xs text-gray-500">+{extraRulesCount} more rule(s)</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {policyItems.map((policy) => (
                      <div
                        key={policy.label}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          policy.allowed
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        {policy.label}: {policy.allowed ? 'Allowed' : 'Not allowed'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm p-5 sm:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Reviews
                  {reviewStats && (
                    <span className="ml-3 text-lg font-normal text-gray-600">
                      ({reviewStats.total_reviews})
                    </span>
                  )}
                </h2>
                {reviewStats && reviewStats.average_rating > 0 && (
                  <div className="flex items-center space-x-2">
                    <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                    <span className="text-xl font-bold text-gray-900">
                      {reviewStats.average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {loadingReviews ? (
                <div className="text-center py-8 text-gray-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reviews yet. Be the first to review this property!
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{review.traveler_name || 'Anonymous'}</h3>
                          <div className="flex items-center space-x-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              id="booking-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-24"
            >
              <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/80">Reserve This Stay</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{formatCurrency(nightlyPrice)}</span>
                      <span className="text-sm text-white/80">per night</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    <SparklesIcon className="w-4 h-4" />
                    Instant
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Booking Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                      Check-in
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="bnb-booking-checkin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                      Check-out
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      data-testid="bnb-booking-checkout"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                    Guests
                  </label>
                  <div className="relative">
                    <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 text-center">
                    <p className="text-gray-500">Max Guests</p>
                    <p className="font-semibold text-gray-900">{maxGuests || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 text-center">
                    <p className="text-gray-500">Min Nights</p>
                    <p className="font-semibold text-gray-900">{minNights}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 text-center">
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-semibold text-gray-900">{formatTime(listing.check_in_time)}</p>
                  </div>
                </div>

                {(exceedsGuests || belowMinNights || aboveMaxNights || (hasDates && !isDateRangeValid)) && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {!isDateRangeValid && hasDates && <p>Check-out must be after check-in.</p>}
                    {exceedsGuests && <p>Guest count exceeds this listing limit ({maxGuests}).</p>}
                    {belowMinNights && <p>Minimum stay is {minNights} night(s).</p>}
                    {aboveMaxNights && <p>Maximum stay is {maxNights} night(s).</p>}
                  </div>
                )}

                <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown</h3>
                  {isDateRangeValid ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{formatCurrency(nightlyPrice)} x {nights} night(s)</span>
                        <span className="text-gray-900">{formatCurrency(accommodationTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cleaning fee</span>
                        <span className="text-gray-900">{formatCurrency(cleaningFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service fee</span>
                        <span className="text-gray-900">{formatCurrency(serviceFee)}</span>
                      </div>
                      {securityDeposit > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Refundable security deposit</span>
                          <span>{formatCurrency(securityDeposit)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                        <span>Estimated total</span>
                        <span>{formatCurrency(estimatedTotal)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Select valid check-in and check-out dates to see your total.</p>
                  )}
                </div>

                <button
                  onClick={handleBookNow}
                  disabled={isBooking || (isAuthenticated && !canSubmitBooking)}
                  data-testid="bnb-booking-submit"
                  className="mt-6 w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CalendarIcon className="w-5 h-5" />
                  <span>{isBooking ? 'Processing...' : (isAuthenticated ? 'Reserve Now' : 'Log In To Reserve')}</span>
                </button>

                <p className="mt-3 text-xs text-gray-500 text-center">
                  No charge now. You will confirm payment on the next step.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BnBDetailPage;
