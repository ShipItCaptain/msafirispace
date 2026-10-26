import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../contexts/FavoritesContext';
import { authAPI, bookingsAPI } from '../../services/api';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ReferralsPanel from '../../components/referrals/ReferralsPanel';
import HotelCard from '../../components/hotel/HotelCard';
import BnBCard from '../../components/bnb/BnBCard';

const PRIMARY_TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'saved', label: 'Saved' },
];

const ACCOUNT_ITEMS = [
  { id: 'payments', label: 'Payments', icon: CreditCardIcon },
  { id: 'referrals', label: 'Referrals', icon: UsersIcon },
  { id: 'profile', label: 'Profile', icon: Cog6ToothIcon },
];

const mapInitialTab = (tab) => {
  if (!tab) return 'upcoming';
  if (tab === 'overview' || tab === 'bookings') return 'upcoming';
  if (tab === 'favorites') return 'saved';
  if (['upcoming', 'past', 'saved', 'payments', 'referrals', 'profile'].includes(tab)) return tab;
  return 'upcoming';
};

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
};

const formatStayDates = (checkIn, checkOut) => {
  if (!checkIn) return 'Dates TBD';
  const start = new Date(checkIn);
  const end = checkOut ? new Date(checkOut) : null;
  const opts = { month: 'short', day: 'numeric' };
  if (!end || Number.isNaN(end.getTime())) {
    return start.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  }
  const left = start.toLocaleDateString(undefined, opts);
  const right = end.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return `${left} – ${right}`;
};

const bookingTitle = (booking) =>
  booking.bnb_listing_title ||
  booking.bnb_listing?.title ||
  booking.hotel_name ||
  booking.hotel?.name ||
  booking.room_type?.hotel?.name ||
  'Your stay';

const bookingPlace = (booking) => {
  const city =
    booking.bnb_listing?.city ||
    booking.hotel?.city ||
    booking.room_type?.hotel?.city ||
    '';
  const country =
    booking.bnb_listing?.country ||
    booking.hotel?.country ||
    booking.room_type?.hotel?.country ||
    '';
  return [city, country].filter(Boolean).join(', ');
};

const bookingImage = (booking) =>
  booking.bnb_listing?.primary_image ||
  booking.hotel?.primary_image ||
  booking.room_type?.hotel?.primary_image ||
  null;

const bookingDetailPath = (booking) => `/booking/${booking.id}`;

const statusMeta = (booking) => {
  if (booking.status === 'confirmed') return { label: 'Confirmed', className: 'bg-green-50 text-green-800' };
  if (booking.status === 'pending') return { label: 'Pending', className: 'bg-amber-50 text-amber-800' };
  if (booking.status === 'cancelled') return { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
  if (booking.status === 'completed') return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
  return { label: booking.status || 'Trip', className: 'bg-gray-100 text-gray-700' };
};

const categorizeBookings = (bookingsList) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const categorized = { upcoming: [], past: [], paymentDue: [] };

  bookingsList.forEach((booking) => {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    const unpaid =
      booking.payment_status &&
      booking.payment_status !== 'paid' &&
      booking.status !== 'cancelled' &&
      booking.status !== 'completed';

    if (unpaid) categorized.paymentDue.push(booking);

    if (booking.status === 'cancelled' || booking.status === 'completed' || checkOut < today) {
      categorized.past.push(booking);
    } else if (booking.status === 'pending' || checkIn >= today || (checkIn <= today && today < checkOut)) {
      categorized.upcoming.push(booking);
    } else {
      categorized.past.push(booking);
    }
  });

  categorized.upcoming.sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));
  categorized.past.sort((a, b) => (b.check_out || '').localeCompare(a.check_out || ''));
  return categorized;
};

const TripCard = ({ booking, onCancel }) => {
  const navigate = useNavigate();
  const meta = statusMeta(booking);
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const image = bookingImage(booking);
  const title = bookingTitle(booking);
  const place = bookingPlace(booking);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const needsPay =
    booking.payment_status &&
    booking.payment_status !== 'paid' &&
    booking.status !== 'cancelled' &&
    booking.status !== 'completed';

  return (
    <article data-testid="trip-card" className="bg-white border border-gray-200 overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-44 h-36 sm:h-auto bg-gray-100 flex-shrink-0">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full min-h-[9rem] bg-gray-200" aria-hidden />
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
          </div>
          {place && <p className="mt-0.5 text-sm text-gray-500">{place}</p>}
          <p className="mt-1 text-sm text-gray-700">
            {formatStayDates(booking.check_in, booking.check_out)}
            {nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
          </p>
          {booking.total_amount != null && (
            <p className="mt-1 text-sm text-gray-600">
              {booking.currency || 'KSh'} {Number(booking.total_amount).toLocaleString()}
              {needsPay ? (
                <span className="ml-2 text-amber-700">
                  · Payment {String(booking.payment_status).replace(/_/g, ' ')}
                </span>
              ) : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={() => navigate(bookingDetailPath(booking))}
            className="px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            {needsPay ? 'Pay' : 'Details'}
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const GuestTripsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => mapInitialTab(location.state?.initialTab));
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  const [guestSummary, setGuestSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [favoritesFilter, setFavoritesFilter] = useState('all');
  const [favoriteBusyId, setFavoriteBusyId] = useState(null);

  const {
    combinedFavorites,
    loading: favoritesLoading,
    error: favoritesError,
    refreshFavorites,
    toggleHotelFavorite,
    toggleBnBFavorite,
  } = useFavorites();

  useEffect(() => {
    const initialTab = location.state?.initialTab;
    if (initialTab) {
      setActiveTab(mapInitialTab(initialTab));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await authAPI.getUserDashboard();
        setGuestSummary(data);
      } catch {
        // non-blocking for trips list
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab !== 'upcoming' && activeTab !== 'past' && activeTab !== 'payments') return;
    const loadBookings = async () => {
      try {
        setBookingsLoading(true);
        setBookingsError(null);
        const data = await bookingsAPI.getBookings();
        setBookings(data.results || data || []);
      } catch (err) {
        setBookingsError('Failed to load trips');
        console.error(err);
      } finally {
        setBookingsLoading(false);
      }
    };
    loadBookings();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'saved') return;
    refreshFavorites();
  }, [activeTab, refreshFavorites]);

  useEffect(() => {
    if (activeTab !== 'saved') return;
    const queryFilter = searchParams.get('favType');
    const localFilter = localStorage.getItem('dashboardFavoritesFilter');
    const nextFilter = queryFilter || localFilter || 'all';
    if (['all', 'hotel', 'bnb'].includes(nextFilter)) setFavoritesFilter(nextFilter);
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (activeTab !== 'saved') return;
    localStorage.setItem('dashboardFavoritesFilter', favoritesFilter);
    if (searchParams.get('favType') === favoritesFilter) return;
    const next = new URLSearchParams(searchParams);
    next.set('favType', favoritesFilter);
    setSearchParams(next, { replace: true });
  }, [activeTab, favoritesFilter, searchParams, setSearchParams]);

  useEffect(() => {
    const onDoc = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const categorized = useMemo(() => categorizeBookings(bookings), [bookings]);
  const hotelFavorites = combinedFavorites.filter((fav) => fav.type === 'hotel');
  const bnbFavorites = combinedFavorites.filter((fav) => fav.type === 'bnb');
  const outstandingAmount = Number(guestSummary?.quick_stats?.pending_bookings_amount || 0);
  const paymentDue = categorized.paymentDue[0] || null;

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      setIsCancellingBooking(true);
      await bookingsAPI.cancelBooking(bookingToCancel);
      const data = await bookingsAPI.getBookings();
      setBookings(data.results || data || []);
      toast.success('Booking cancelled');
      setBookingToCancel(null);
    } catch (err) {
      toast.error('Failed to cancel booking. Please try again.');
      console.error(err);
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const handleToggleHotelFavorite = async (hotelId) => {
    setFavoriteBusyId(`hotel-${hotelId}`);
    const result = await toggleHotelFavorite(Number(hotelId));
    setFavoriteBusyId(null);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success('Removed from favorites');
  };

  const handleToggleBnBFavorite = async (bnbId) => {
    setFavoriteBusyId(`bnb-${bnbId}`);
    const result = await toggleBnBFavorite(Number(bnbId));
    setFavoriteBusyId(null);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success('Removed from favorites');
  };

  const renderEmptyTrips = (kind) => (
    <div className="border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <CalendarDaysIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden />
      <p className="text-base font-medium text-gray-900">
        {kind === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}
      </p>
      <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
        {kind === 'upcoming'
          ? 'When you book a stay, it’ll show up here.'
          : 'Completed and cancelled trips will appear here.'}
      </p>
      {kind === 'upcoming' && (
        <Link
          to="/bnbs"
          className="inline-flex mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
        >
          Explore stays
        </Link>
      )}
    </div>
  );

  const renderTripsList = (list, emptyKind) => {
    if (bookingsLoading) {
      return (
        <div className="space-y-3" aria-busy="true">
          {[1, 2].map((n) => (
            <div key={n} className="animate-pulse border border-gray-200 bg-white h-36" />
          ))}
        </div>
      );
    }
    if (bookingsError) {
      return (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {bookingsError}
        </div>
      );
    }
    if (!list.length) return renderEmptyTrips(emptyKind);
    return (
      <div className="space-y-3">
        {list.map((booking) => (
          <TripCard key={booking.id} booking={booking} onCancel={setBookingToCancel} />
        ))}
      </div>
    );
  };

  const renderSaved = () => {
    const visibleFavorites = combinedFavorites.filter((fav) => {
      if (favoritesFilter === 'all') return true;
      return fav.type === favoritesFilter;
    });

    if (favoritesLoading) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="mt-2 h-4 w-2/3 bg-gray-200" />
            </div>
          ))}
        </div>
      );
    }

    if (favoritesError) {
      return (
        <div className="text-center py-10 border border-red-200 bg-red-50">
          <p className="text-red-700 mb-4">{favoritesError}</p>
          <button
            type="button"
            onClick={refreshFavorites}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (combinedFavorites.length === 0) {
      return (
        <div className="border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-medium text-gray-900">No saved places yet</p>
          <p className="mt-1 text-sm text-gray-500">Tap the heart on a stay to save it here.</p>
          <Link
            to="/bnbs"
            className="inline-flex mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            Find places to stay
          </Link>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { id: 'all', label: `All (${combinedFavorites.length})` },
            { id: 'hotel', label: `Hotels (${hotelFavorites.length})` },
            { id: 'bnb', label: `BnBs (${bnbFavorites.length})` },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFavoritesFilter(chip.id)}
              className={`px-3 py-1.5 text-sm font-medium border ${
                favoritesFilter === chip.id
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {visibleFavorites.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200">
            <p className="text-gray-600">No favorites in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleFavorites.map((fav) => {
              if (fav.type === 'hotel') {
                const hotel = fav.hotel || { id: fav.hotel_id };
                return (
                  <div key={`hotel-${fav.id}`}>
                    <HotelCard
                      hotel={hotel}
                      isFavorite
                      favoriteLoading={favoriteBusyId === `hotel-${hotel.id}`}
                      onToggleFavorite={handleToggleHotelFavorite}
                    />
                    <span className="sr-only">Saved • Hotel</span>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                      onClick={() => handleToggleHotelFavorite(hotel.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              }

              const listing = fav.bnb_listing || { id: fav.bnb_listing_id };
              return (
                <div key={`bnb-${fav.id}`}>
                  <BnBCard
                    listing={listing}
                    isFavorite
                    favoriteLoading={favoriteBusyId === `bnb-${listing.id}`}
                    onToggleFavorite={handleToggleBnBFavorite}
                  />
                  <span className="sr-only">Saved • BnB</span>
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                    onClick={() => handleToggleBnBFavorite(listing.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPayments = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
      {outstandingAmount > 0 || paymentDue ? (
        <div className="border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Payment due</p>
            <p className="text-sm text-amber-800">
              {paymentDue
                ? `${bookingTitle(paymentDue)} · ${formatStayDates(paymentDue.check_in, paymentDue.check_out)}`
                : `Outstanding balance: KSh ${outstandingAmount.toLocaleString()}`}
            </p>
          </div>
          {paymentDue && (
            <button
              type="button"
              onClick={() => navigate(bookingDetailPath(paymentDue))}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
            >
              Pay now
            </button>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-base font-medium text-gray-900">You’re all caught up</p>
          <p className="mt-1 text-sm text-gray-500">No outstanding payments right now.</p>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
      <div className="bg-white border border-gray-200 p-5 space-y-3 text-sm">
        <div>
          <p className="text-gray-500">Name</p>
          <p className="font-medium text-gray-900">
            {user?.first_name} {user?.last_name}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{user?.email}</p>
        </div>
        <Link to="/profile" className="inline-flex text-sm font-semibold text-red-600 hover:text-red-700">
          Edit profile →
        </Link>
      </div>
    </div>
  );

  const isAccountTab = ACCOUNT_ITEMS.some((item) => item.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Trips</h1>

        {paymentDue && activeTab === 'upcoming' && (
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className="mb-5 w-full text-left border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-100"
          >
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Payment due for {bookingTitle(paymentDue)}
              </p>
              <p className="text-xs text-amber-800">
                {formatStayDates(paymentDue.check_in, paymentDue.check_out)}
              </p>
            </div>
            <span className="text-sm font-semibold text-amber-900">Review</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-1 mb-8 border-b border-gray-200">
          {PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {tab.id === 'saved' ? <span className="sr-only"> Favorites</span> : null}
            </button>
          ))}
          <div className="relative ml-auto" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1 px-4 py-2.5 text-sm font-semibold border-b-2 ${
                isAccountTab
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Account
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {accountOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 shadow-sm z-20 py-1"
              >
                {ACCOUNT_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab(item.id);
                      setAccountOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <item.icon className="w-4 h-4 text-gray-400" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming</h2>
            <span className="sr-only">My Bookings</span>
            {renderTripsList(categorized.upcoming, 'upcoming')}
          </div>
        )}

        {activeTab === 'past' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Past</h2>
            {renderTripsList(categorized.past, 'past')}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Saved</h2>
            {renderSaved()}
          </div>
        )}

        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'referrals' && <ReferralsPanel />}
        {activeTab === 'profile' && renderProfile()}

        <ConfirmDialog
          isOpen={Boolean(bookingToCancel)}
          title="Cancel trip?"
          message="This will cancel your reservation. If payment was made, refund handling follows your booking policy."
          confirmLabel="Confirm cancel"
          cancelLabel="Keep trip"
          isLoading={isCancellingBooking}
          onConfirm={handleCancelBooking}
          onCancel={() => setBookingToCancel(null)}
          tone="danger"
        />
      </div>
    </div>
  );
};

export default GuestTripsPage;
