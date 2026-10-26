import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  HeartIcon,
  ShareIcon,
  ArrowLeftIcon,
  HomeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { bnbAPI, bookingsAPI, getApiErrorDetails, reviewsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { StarIcon } from '@heroicons/react/24/solid';
import { IconDoor, IconBath, IconBed, IconUsers } from '@tabler/icons-react';
import { useFavorites } from '../contexts/FavoritesContext';
import SEO from '../components/common/SEO';
import ImageLightbox from '../components/common/ImageLightbox';
import SectionDivider from '../components/common/SectionDivider';
import InfoCard from '../components/common/InfoCard';
import StayFactRow from '../components/common/StayFactRow';
import AmenityList from '../components/common/AmenityList';
import TruncatedText from '../components/common/TruncatedText';

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="34">No image available</text></svg>';

const onImageError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMAGE;
};

const BnBDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isBnBFavorite, isBnBFavoriteBusy, toggleBnBFavorite } = useFavorites();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingNotice, setBookingNotice] = useState(null);
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

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
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
    setBookingNotice(null);

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/bnb/${id}` } } });
      return;
    }

    if (!checkIn || !checkOut) {
      setBookingNotice('Please select check-in and check-out dates.');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      setBookingNotice('Check-out date must be after check-in date.');
      return;
    }

    if (guests < 1) {
      setBookingNotice('Please specify at least 1 guest.');
      return;
    }

    if (listing?.max_guests && guests > Number(listing.max_guests)) {
      setBookingNotice(`This listing allows up to ${listing.max_guests} guest(s).`);
      return;
    }

    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (listing?.minimum_nights && nights < Number(listing.minimum_nights)) {
      setBookingNotice(`Minimum stay is ${listing.minimum_nights} night(s).`);
      return;
    }
    if (listing?.maximum_nights && nights > Number(listing.maximum_nights)) {
      setBookingNotice(`Maximum stay is ${listing.maximum_nights} night(s).`);
      return;
    }

    try {
      setIsBooking(true);
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
      toast.success('Reservation requested!');
      navigate(`/booking/${booking.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      const { message, requestId } = getApiErrorDetails(error, 'Couldn’t create this reservation. Please try again.');
      if (requestId) console.error('Booking request_id:', requestId);
      setBookingNotice(message);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-14 lg:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
          <div className="h-8 w-2/3 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-1/3 bg-gray-200 rounded mb-8" />
          <div className="flex flex-col sm:flex-row gap-2 mb-8" style={{ height: 420 }}>
            <div className="sm:w-3/5 h-56 sm:h-full bg-gray-200 rounded-lg" />
            <div className="sm:w-2/5 flex flex-row sm:flex-col gap-2 h-56 sm:h-full">
              <div className="flex-1 bg-gray-200 rounded-lg" />
              <div className="flex-1 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-11/12" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-4">BnB Not Found</h1>
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

  // Normalized to { image, caption } so real per-photo captions (already on
  // the API — BnBImageSerializer includes `caption`) drive alt text instead
  // of falling back to the listing title for every photo.
  const rawImageEntries = [
    ...(listing.primary_image ? [{ image: listing.primary_image, caption: null }] : []),
    ...((listing.images || []).map((img) => (
      typeof img === 'string' ? { image: img, caption: null } : { image: img?.image, caption: img?.caption || null }
    ))),
  ].filter((entry) => Boolean(entry.image));

  const seenImages = new Set();
  const imageEntries = rawImageEntries.filter((entry) => {
    if (seenImages.has(entry.image)) return false;
    seenImages.add(entry.image);
    return true;
  });

  const amenities = Array.isArray(listing.amenities) ? listing.amenities : [];
  const houseRules = Array.isArray(listing.house_rules) ? listing.house_rules : [];
  const rulesPreview = houseRules.slice(0, 4);
  const displayedRules = showAllRules ? houseRules : rulesPreview;
  const extraRulesCount = Math.max(0, houseRules.length - rulesPreview.length);
  const policyItems = [
    { label: 'Smoking', allowed: Boolean(listing.smoking_allowed) },
    { label: 'Pets', allowed: Boolean(listing.pets_allowed) },
    { label: 'Parties', allowed: Boolean(listing.parties_allowed) },
    { label: 'Children', allowed: Boolean(listing.children_allowed) },
  ];
  const hasHouseRulesSection = houseRules.length > 0
    || listing.smoking_allowed !== undefined
    || listing.pets_allowed !== undefined
    || listing.parties_allowed !== undefined
    || listing.children_allowed !== undefined;

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
    <div className="min-h-screen bg-white pt-14 lg:pt-20">
      <SEO title={listing.title} description={listing.description} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/bnbs')}
          className="mb-6 flex items-center text-gray-500 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded"
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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2 break-words">{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                {(listing.city || listing.country || listing.address || (listing.latitude && listing.longitude)) && (
                  <a
                    href={
                      listing.latitude && listing.longitude
                        ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            [listing.address, listing.city, listing.country].filter(Boolean).join(', ')
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
                  >
                    <MapPinIcon className="w-4 h-4" />
                    {[listing.city, listing.country].filter(Boolean).join(', ') || 'View location'}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={handleFavoriteToggle}
                disabled={isFavoriteLoading}
                className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isFavorite
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HeartIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                aria-label="Share"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Photo Collage */}
        {imageEntries.length > 0 ? (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-2" style={{ height: 420 }}>
              <button
                onClick={() => openLightbox(0)}
                className="sm:w-3/5 h-56 sm:h-full rounded-xl overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <img
                  src={imageEntries[0].image}
                  alt={imageEntries[0].caption || listing.title}
                  onError={onImageError}
                  className="w-full h-full object-cover"
                />
              </button>
              {(imageEntries[1] || imageEntries[2]) && (
                <div className="sm:w-2/5 flex flex-row sm:flex-col gap-2 h-56 sm:h-full">
                  {imageEntries[1] && (
                    <button
                      onClick={() => openLightbox(1)}
                      className="flex-1 rounded-xl overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <img
                        src={imageEntries[1].image}
                        alt={imageEntries[1].caption || listing.title}
                        onError={onImageError}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                  {imageEntries[2] && (
                    <button
                      onClick={() => openLightbox(2)}
                      className="flex-1 rounded-xl overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <img
                        src={imageEntries[2].image}
                        alt={imageEntries[2].caption || listing.title}
                        onError={onImageError}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
            {imageEntries.length > 3 && (
              <div className="grid grid-cols-4 gap-2 mt-2" style={{ height: 90 }}>
                {imageEntries.slice(3, 7).map((entry, i) => {
                  const realIndex = i + 3;
                  const isLastSlot = i === 3 && imageEntries.length > 7;
                  return (
                    <button
                      key={entry.image}
                      onClick={() => openLightbox(realIndex)}
                      className="relative rounded-xl overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <img
                        src={entry.image}
                        alt={entry.caption || listing.title}
                        onError={onImageError}
                        className="w-full h-full object-cover"
                      />
                      {isLastSlot && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                          +{imageEntries.length - 7} photos
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-64 rounded-xl bg-gray-100 flex items-center justify-center mb-8">
            <HomeIcon className="w-16 h-16 text-gray-500" />
          </div>
        )}

        {/* Mobile Quick Reserve Bar */}
        <div className="lg:hidden sticky top-14 z-20 mb-5">
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
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center"
                    aria-label="Guests"
                  />
                </div>
                <button
                  type="button"
                  onClick={scrollToBookingCard}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content — one continuous flow, hairline dividers between
              sections, no shadowed boxes (only the booking card floats). */}
          <div className="lg:col-span-2">
            {listing.description && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-baseline gap-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">About this place</h2>
                  <span className="text-xs font-medium text-green-700">
                    {listing.property_type || 'BnB'}
                  </span>
                </div>
                <TruncatedText text={listing.description} lines={4} title="About this place" />
              </motion.div>
            )}

            <SectionDivider />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Listing Highlights</h2>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <StayFactRow icon={IconDoor} quantity={listing.bedrooms} label="bedroom" />
                <StayFactRow icon={IconBath} quantity={listing.bathrooms} label="bathroom" />
                <StayFactRow icon={IconBed} quantity={listing.beds} label="bed" />
                <StayFactRow icon={IconUsers} quantity={listing.max_guests} label="guest" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 mt-6">
                <InfoCard label="Min nights" value={listing.minimum_nights ?? '—'} />
                <InfoCard label="Max nights" value={listing.maximum_nights ?? '—'} />
                <InfoCard label="Check-in" value={formatTime(listing.check_in_time)} />
                <InfoCard label="Check-out" value={formatTime(listing.check_out_time)} />
              </div>
            </motion.div>

            {amenities.length > 0 && (
              <>
                <SectionDivider />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <AmenityList amenities={amenities} />
                </motion.div>
              </>
            )}

            {hasHouseRulesSection && (
              <>
                <SectionDivider />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">House Rules</h2>
                  {houseRules.length > 0 && (
                    <ul className="list-disc list-inside text-gray-900 text-sm space-y-1.5 mb-4">
                      {displayedRules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  )}
                  {houseRules.length > rulesPreview.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllRules((prev) => !prev)}
                      className="mb-4 text-sm font-semibold text-gray-900 underline hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded"
                    >
                      {showAllRules ? 'Show fewer house rules' : `Show all house rules (${houseRules.length})`}
                    </button>
                  )}
                  {!showAllRules && extraRulesCount > 0 && (
                    <p className="mb-4 text-xs text-gray-500">+{extraRulesCount} more rule(s)</p>
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
                </motion.div>
              </>
            )}

            <SectionDivider />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Reviews
                  {reviewStats && (
                    <span className="ml-3 text-base font-normal text-gray-500">
                      ({reviewStats.total_reviews})
                    </span>
                  )}
                </h2>
                {reviewStats && Number(reviewStats.average_rating) > 0 && (
                  <div className="flex items-center space-x-2">
                    <StarIcon className="w-6 h-6 text-yellow-400 fill-current" />
                    <span className="text-xl font-bold text-gray-900">
                      {Number(reviewStats.average_rating).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {loadingReviews ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-gray-500 py-4">
                  No reviews yet. Be the first to review this property!
                </p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-hairline pb-6 last:border-0 last:pb-0">
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
                            <span className="ml-2 text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-900 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Booking Sidebar — the one element that keeps elevation/shadow */}
          <div className="lg:col-span-1">
            <motion.div
              id="booking-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-24"
            >
              {bookingNotice && (
                <div className="absolute inset-x-3 top-3 z-20 rounded-lg border border-red-200 bg-white/95 backdrop-blur-sm px-3 py-2.5 shadow-md">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs leading-relaxed text-gray-700">{bookingNotice}</p>
                    <button
                      type="button"
                      onClick={() => setBookingNotice(null)}
                      className="p-0.5 text-gray-500 hover:text-gray-600"
                      aria-label="Dismiss"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="text-2xl font-semibold text-gray-900">{formatCurrency(nightlyPrice)}</span>
                  <span className="text-sm text-gray-500">night</span>
                </div>

                {/* Single stay control — dates + guests */}
                <div className="rounded-xl border border-gray-300 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-gray-300">
                    <label className="block px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-900">
                        Check-in
                      </span>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          setBookingNotice(null);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="bnb-booking-checkin"
                        className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0"
                      />
                    </label>
                    <label className="block px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-900">
                        Check-out
                      </span>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => {
                          setCheckOut(e.target.value);
                          setBookingNotice(null);
                        }}
                        min={checkIn || new Date().toISOString().split('T')[0]}
                        data-testid="bnb-booking-checkout"
                        className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0"
                      />
                    </label>
                  </div>
                  <label className="block border-t border-gray-300 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-900">
                      Guests
                    </span>
                    <input
                      type="number"
                      value={guests}
                      onChange={(e) => {
                        setGuests(parseInt(e.target.value, 10) || 1);
                        setBookingNotice(null);
                      }}
                      min="1"
                      max={maxGuests || undefined}
                      className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0"
                    />
                  </label>
                </div>

                {(exceedsGuests || belowMinNights || aboveMaxNights || (hasDates && !isDateRangeValid)) && (
                  <p className="mt-3 text-xs text-amber-800">
                    {!isDateRangeValid && hasDates && 'Check-out must be after check-in. '}
                    {exceedsGuests && `Up to ${maxGuests} guests. `}
                    {belowMinNights && `Minimum stay ${minNights} night(s). `}
                    {aboveMaxNights && `Maximum stay ${maxNights} night(s).`}
                  </p>
                )}

                {isDateRangeValid && (
                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 underline decoration-ink-muted/30 underline-offset-2">
                        {formatCurrency(nightlyPrice)} × {nights} night{nights === 1 ? '' : 's'}
                      </span>
                      <span className="text-gray-900">{formatCurrency(accommodationTotal)}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500 underline decoration-ink-muted/30 underline-offset-2">
                          Cleaning fee
                        </span>
                        <span className="text-gray-900">{formatCurrency(cleaningFee)}</span>
                      </div>
                    )}
                    {serviceFee > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500 underline decoration-ink-muted/30 underline-offset-2">
                          Service fee
                        </span>
                        <span className="text-gray-900">{formatCurrency(serviceFee)}</span>
                      </div>
                    )}
                    {securityDeposit > 0 && (
                      <div className="flex justify-between gap-3 text-xs text-gray-500">
                        <span>Refundable security deposit</span>
                        <span>{formatCurrency(securityDeposit)}</span>
                      </div>
                    )}
                    <div className="pt-3 mt-1 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(estimatedTotal)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBookNow}
                  disabled={isAuthenticated && (isBooking || !canSubmitBooking)}
                  data-testid="bnb-booking-submit"
                  className="mt-5 w-full bg-red-600 text-white py-3.5 px-4 rounded-lg text-base font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {isBooking ? 'Processing...' : 'Reserve'}
                </button>
                <p className="mt-3 text-xs text-gray-500 text-center">
                  {isAuthenticated
                    ? 'You won’t be charged yet'
                    : 'You’ll log in to complete this reservation · You won’t be charged yet'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <ImageLightbox
        images={imageEntries}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={listing.title}
      />
    </div>
  );
};

export default BnBDetailPage;
