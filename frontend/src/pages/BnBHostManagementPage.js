import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { bnbAPI, bookingsAPI, reviewsAPI } from '../services/api';
import { getBnBListingStatus, BNB_STATUS_LABELS, BNB_STATUS_STYLES } from '../utils/bnbOptions';
import AvailabilityCalendarModal from '../components/bnb/AvailabilityCalendarModal';
import BnBBookingsPanel from './dashboard/BnBBookingsPanel';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CalendarIcon,
  MapPinIcon,
  HomeIcon,
  Squares2X2Icon,
  Bars3Icon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">No image</text></svg>';

const todayKey = () => new Date().toISOString().slice(0, 10);

const listingImage = (listing) => {
  if (listing?.primary_image) return listing.primary_image;
  const first = listing?.images?.[0];
  if (!first) return FALLBACK_IMAGE;
  return typeof first === 'string' ? first : first.image || FALLBACK_IMAGE;
};

const formatMoney = (value) =>
  `KSh ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const BnBHostManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useNotifications();
  const [listings, setListings] = useState([]);
  const [bnbBookings, setBnbBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [viewMode, setViewMode] = useState('grid');
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [availabilityListing, setAvailabilityListing] = useState(null);
  const [activeSection, setActiveSection] = useState(
    location.state?.initialTab === 'bookings' ? 'bookings' : 'listings'
  );

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveSection(location.state.initialTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [listingsResponse, hostBookingsResponse] = await Promise.all([
          bnbAPI.getMyListings(),
          bookingsAPI.getHostBookings(),
        ]);
        const data = listingsResponse?.results || listingsResponse || [];
        const hostBookings = hostBookingsResponse?.results || hostBookingsResponse || [];
        const safeListings = Array.isArray(data) ? data : [];
        const safeHostBookings = Array.isArray(hostBookings) ? hostBookings : [];
        const bnbListingIds = new Set(safeListings.map((listing) => listing.id));
        const bnbOnly = safeHostBookings.filter(
          (booking) => booking.booking_type === 'bnb' && bnbListingIds.has(booking.bnb_listing_id)
        );

        setListings(safeListings);
        setBnbBookings(bnbOnly);

        const totalListings = safeListings.length;
        const activeListings = safeListings.filter((listing) => getBnBListingStatus(listing) === 'active').length;
        const totalBookings = bnbOnly.length;
        const pendingBookings = bnbOnly.filter(
          (booking) =>
            booking.status === 'pending' &&
            (!booking.host_approval_status || booking.host_approval_status === 'pending')
        ).length;
        const totalRevenue = bnbOnly
          .filter((booking) => booking.status !== 'cancelled')
          .reduce((sum, booking) => sum + (parseFloat(booking.total_amount) || 0), 0);

        const reviewStatsResponses = await Promise.allSettled(
          safeListings.map((listing) => reviewsAPI.getBnBReviewStats(listing.id))
        );
        const reviewStats = reviewStatsResponses
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
          .filter(Boolean);
        const totalReviews = reviewStats.reduce((sum, stats) => sum + (stats.total_reviews || 0), 0);
        const weightedRating = reviewStats.reduce(
          (sum, stats) => sum + (stats.average_rating || 0) * (stats.total_reviews || 0),
          0
        );
        const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0;

        setAnalytics({
          totalListings,
          activeListings,
          totalBookings,
          pendingBookings,
          totalRevenue,
          averageRating: Number(averageRating.toFixed(1)),
        });
      } catch (error) {
        console.error('Failed to load BnB listings:', error);
        showError('Failed to Load Listings', 'Could not load your BnB listings. Please try again.', 7000);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showError]);

  const nextBookingByListing = useMemo(() => {
    const today = todayKey();
    const map = {};
    bnbBookings
      .filter((b) => b.status !== 'cancelled' && b.check_out >= today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .forEach((booking) => {
        if (!map[booking.bnb_listing_id]) map[booking.bnb_listing_id] = booking;
      });
    return map;
  }, [bnbBookings]);

  const draftCount = useMemo(
    () => listings.filter((listing) => getBnBListingStatus(listing) === 'draft').length,
    [listings]
  );

  const filteredListings = listings
    .filter((listing) => {
      const haystack = `${listing.title || ''} ${listing.city || ''} ${listing.address || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const status = getBnBListingStatus(listing);
      const matchesFilter = filterStatus === 'all' || status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'price') return Number(a.price_per_night || 0) - Number(b.price_per_night || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your BnB listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {activeSection === 'bookings' ? 'Reservations' : 'Your listings'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {activeSection === 'bookings'
                  ? 'Guests staying in your places'
                  : 'Manage availability, photos, and publishing'}
              </p>
            </div>
            {activeSection === 'listings' && (
              <button
                type="button"
                onClick={() => navigate('/become-host/bnb')}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700"
              >
                <PlusIcon className="w-5 h-5" />
                Add listing
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {[
            { id: 'listings', label: 'Listings' },
            {
              id: 'bookings',
              label: analytics.pendingBookings > 0 ? `Bookings (${analytics.pendingBookings})` : 'Bookings',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeSection === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection === 'bookings' && (
          <BnBBookingsPanel
            onOpenAvailability={(booking) => {
              const listing = listings.find((item) => item.id === booking.bnb_listing_id);
              setAvailabilityListing(
                listing || {
                  id: booking.bnb_listing_id,
                  title: booking.bnb_listing_title || booking.hotel_name || 'Listing',
                  price_per_night: listing?.price_per_night || 0,
                  currency: booking.currency || 'KES',
                }
              );
            }}
            onOpenHouseGuide={(booking) => {
              if (booking.bnb_listing_id) {
                navigate(`/host/bnb/${booking.bnb_listing_id}`, { state: { section: 'rules' } });
              }
            }}
          />
        )}

        {activeSection === 'listings' && (
          <>
            {(analytics.pendingBookings > 0 || draftCount > 0) && (
              <div className="mb-6 space-y-2">
                {analytics.pendingBookings > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveSection('bookings')}
                    className="w-full text-left border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        {analytics.pendingBookings} reservation
                        {analytics.pendingBookings > 1 ? 's' : ''} need your response
                      </p>
                      <p className="text-xs text-amber-800">Guests are waiting on confirmation</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-900">Review</span>
                  </button>
                )}
                {draftCount > 0 && (
                  <div className="border border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {draftCount} draft{draftCount > 1 ? 's' : ''} still unfinished
                      </p>
                      <p className="text-xs text-gray-500">Finish photos, pricing, or location to publish</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {listings.length > 0 && (
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input
                      type="search"
                      placeholder="Search by title or city…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search listings"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    aria-label="Filter by status"
                    className="px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Live</option>
                    <option value="paused">Paused</option>
                    <option value="draft">Draft</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort listings"
                    className="px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="created_at">Newest first</option>
                    <option value="title">Title A–Z</option>
                    <option value="price">Price low–high</option>
                  </select>
                  <div className="flex items-center border border-gray-300" role="group" aria-label="Listing view mode">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-gray-700'}`}
                      aria-pressed={viewMode === 'grid'}
                      aria-label="Grid view"
                    >
                      <Squares2X2Icon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-gray-700'}`}
                      aria-pressed={viewMode === 'list'}
                      aria-label="List view"
                    >
                      <Bars3Icon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                  : 'space-y-3'
              }
            >
              <AnimatePresence>
                {filteredListings.map((listing) => {
                  const status = getBnBListingStatus(listing);
                  const nextBooking = nextBookingByListing[listing.id];
                  const locationLabel = [listing.city, listing.country].filter(Boolean).join(', ');
                  const primaryIsEdit = status === 'draft';

                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={`bg-white border border-gray-200 overflow-hidden ${
                        viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                      }`}
                    >
                      <div className={`${viewMode === 'list' ? 'sm:w-56 sm:flex-shrink-0 h-40 sm:h-auto' : 'h-44'} relative bg-gray-100`}>
                        <img
                          src={listingImage(listing)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                        <span className={`absolute top-3 left-3 px-2 py-0.5 text-[11px] font-semibold ${BNB_STATUS_STYLES[status]}`}>
                          {BNB_STATUS_LABELS[status]}
                        </span>
                      </div>

                      <div className={`p-4 flex flex-col ${viewMode === 'list' ? 'flex-1' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {listing.title || 'Untitled listing'}
                            </h3>
                            {locationLabel ? (
                              <p className="mt-0.5 text-xs text-gray-500 truncate flex items-center gap-1">
                                <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                                {locationLabel}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-amber-700">Add a location to publish</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold text-gray-900">{formatMoney(listing.price_per_night)}</p>
                            <p className="text-[11px] text-gray-500">per night</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-600">
                          <ClockIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />
                          {status === 'draft' ? (
                            <span className="text-amber-700">Draft · finish setup to go live</span>
                          ) : nextBooking ? (
                            <span>
                              Next stay · {nextBooking.check_in} → {nextBooking.check_out}
                              {nextBooking.guest_full_name || nextBooking.traveler_name
                                ? ` · ${nextBooking.guest_full_name || nextBooking.traveler_name}`
                                : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">No upcoming guests</span>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                          {primaryIsEdit ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/host/bnb/${listing.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                              Continue setup
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setAvailabilityListing(listing)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                              >
                                <CalendarIcon className="w-3.5 h-3.5" />
                                Availability
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/host/bnb/${listing.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filteredListings.length === 0 && (
              <div className="text-center py-16 bg-white border border-dashed border-gray-200">
                <HomeIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden />
                {listings.length === 0 ? (
                  <>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Create your first listing</h3>
                    <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                      Add a place to stay — you’ll set photos, pricing, and availability next.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/become-host/bnb')}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-red-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add listing
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No matches</h3>
                    <p className="text-sm text-gray-500 mb-5">Try a different search or status filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {availabilityListing && (
        <AvailabilityCalendarModal
          bnbId={availabilityListing.id}
          listingTitle={availabilityListing.title}
          basePrice={availabilityListing.price_per_night}
          currency={availabilityListing.currency || 'KES'}
          onClose={() => setAvailabilityListing(null)}
        />
      )}
    </div>
  );
};

export default BnBHostManagementPage;
