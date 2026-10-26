import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import BnBReservationDrawer from './BnBReservationDrawer';
import useHostBookingsController from './useHostBookingsController';

const todayKey = () => new Date().toISOString().slice(0, 10);

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
  const sameYear = start.getFullYear() === end.getFullYear();
  const left = start.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: 'numeric' });
  const right = end.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return `${left} – ${right}`;
};

const daysUntil = (checkIn, today) => {
  if (!checkIn) return null;
  const start = new Date(`${checkIn}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  return Math.round((start - now) / (1000 * 60 * 60 * 24));
};

const arrivalLabel = (booking, today = todayKey()) => {
  if (booking.status === 'cancelled' || booking.status === 'completed') return null;
  const checkIn = booking.check_in || '';
  const checkOut = booking.check_out || '';
  if (checkIn && checkOut && checkIn <= today && checkOut > today) return 'Guest is staying now';
  const days = daysUntil(checkIn, today);
  if (days === null) return null;
  if (days < 0) return null;
  if (days === 0) return 'Arrives today';
  if (days === 1) return 'Arrives tomorrow';
  if (days <= 14) return `Arrives in ${days} days`;
  return null;
};

const statusMeta = (booking) => {
  if (booking.needsApproval) return { label: 'Needs response', className: 'bg-amber-50 text-amber-800' };
  if (booking.needsPayment) return { label: 'Awaiting payment', className: 'bg-orange-50 text-orange-800' };
  if (booking.status === 'confirmed') return { label: 'Confirmed', className: 'bg-green-50 text-green-800' };
  if (booking.status === 'cancelled') return { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
  if (booking.status === 'completed') return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
  return { label: booking.status || 'Pending', className: 'bg-gray-100 text-gray-700' };
};

const matchesFilter = (booking, filter, today) => {
  const checkIn = booking.check_in || '';
  const checkOut = booking.check_out || '';
  if (filter === 'needs_response') return booking.needsApproval;
  if (filter === 'confirmed') return booking.status === 'confirmed';
  if (filter === 'cancelled') return booking.status === 'cancelled';
  if (filter === 'past') {
    return booking.status === 'completed' || (checkOut && checkOut < today);
  }
  if (filter === 'today') {
    if (booking.status === 'cancelled') return false;
    if (checkIn === today) return true;
    return Boolean(checkIn && checkOut && checkIn <= today && checkOut > today);
  }
  if (filter === 'this_week' || filter === 'arriving_soon') {
    if (booking.status === 'cancelled') return false;
    if (checkIn && checkOut && checkIn <= today && checkOut > today) return true;
    if (!checkIn || checkIn < today) return false;
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return checkIn <= in7.toISOString().slice(0, 10);
  }
  return true;
};

const GuestAvatar = ({ booking, size = 'md' }) => {
  const guestName = booking.guest_name || booking.guest_full_name || 'Guest';
  const initial = (guestName.trim()[0] || 'G').toUpperCase();
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-11 h-11 sm:w-12 sm:h-12 text-base';
  if (booking.traveler_avatar) {
    return (
      <img
        src={booking.traveler_avatar}
        alt=""
        className={`${sizeClass} flex-shrink-0 object-cover bg-gray-100`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex-shrink-0 bg-gray-100 text-gray-600 flex items-center justify-center font-semibold`}
      aria-hidden
    >
      {initial}
    </div>
  );
};

const BnBReservationCard = ({
  booking,
  formatCurrency,
  actionLoadingId,
  pendingAction,
  onView,
  onStatusChange,
}) => {
  const meta = statusMeta(booking);
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const listingTitle = booking.hotel_name || booking.bnb_listing_title || 'Your listing';
  const guestName = booking.guest_name || 'Guest';
  const isLoading = actionLoadingId === booking.id || Boolean(pendingAction);
  const canDecide = booking.needsApproval && !pendingAction;
  const arrival = arrivalLabel(booking);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      data-testid="booking-row"
      className={`bg-white border border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 ${
        pendingAction ? 'opacity-70' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onView(booking)}
        className="flex gap-3 min-w-0 flex-1 text-left"
        aria-label={`Open reservation for ${guestName}`}
      >
        <GuestAvatar booking={booking} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{guestName}</h3>
            <span className={`px-2 py-0.5 text-[11px] sm:text-xs font-medium ${meta.className}`}>{meta.label}</span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-600 truncate">{listingTitle}</p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {formatStayDates(booking.check_in, booking.check_out)}
            {nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
            {' · '}
            {formatCurrency(booking.total_amount || 0)}
          </p>
          {arrival && <p className="mt-1 text-xs font-medium text-red-700">{arrival}</p>}
          {pendingAction && (
            <p className="mt-1 text-xs text-gray-500" aria-live="polite">
              {pendingAction === 'confirmed' ? 'Approving…' : 'Declining…'}
            </p>
          )}
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:flex-shrink-0 pl-[3.25rem] sm:pl-0">
        {canDecide ? (
          <>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStatusChange(booking.id, 'cancelled')}
              className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStatusChange(booking.id, 'confirmed')}
              className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Approve
            </button>
          </>
        ) : booking.status === 'confirmed' ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onStatusChange(booking.id, 'completed')}
            className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Mark complete
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onView(booking)}
            className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            Details
          </button>
        )}
      </div>
    </motion.article>
  );
};

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'needs_response', label: 'Needs response' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
];

// Date lenses live in one control — shorter chip row, host-friendly labels.
const WHEN_OPTIONS = [
  { id: 'today', label: 'Checking in today' },
  { id: 'this_week', label: 'Arriving soon' },
  { id: 'past', label: 'Previous stays' },
];

const WHEN_FILTER_IDS = new Set(WHEN_OPTIONS.map((o) => o.id));

const UNDO_MS = 4500;

const BnBBookingsPanel = ({ onOpenAvailability, onOpenHouseGuide }) => {
  const controller = useHostBookingsController();
  const {
    bookings,
    isLoading,
    loadError,
    loadBookings,
    bookingViewMode,
    setBookingViewMode,
    bookingSearchQuery,
    setBookingSearchQuery,
    bookingSortBy,
    setBookingSortBy,
    calendarMonthCursor,
    setCalendarMonthCursor,
    selectedCalendarDate,
    setSelectedCalendarDate,
    bookingActionLoadingId,
    selectedBooking,
    setSelectedBooking,
    bookingActivityLog,
    handleBookingStatusUpdate,
    exportCsv,
    exportExcel,
    getStatusColor,
    formatCurrency,
    timeAgo,
  } = controller;

  const [filter, setFilter] = useState('all');
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState({});
  const menuRef = useRef(null);
  const whenRef = useRef(null);
  const pendingTimers = useRef({});

  useEffect(() => {
    loadBookings();
    return () => {
      Object.values(pendingTimers.current).forEach((entry) => {
        clearTimeout(entry.timer);
        toast.dismiss(entry.toastId);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (whenRef.current && !whenRef.current.contains(event.target)) setWhenOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const cancelPending = (bookingId) => {
    const entry = pendingTimers.current[bookingId];
    if (!entry) return;
    clearTimeout(entry.timer);
    toast.dismiss(entry.toastId);
    delete pendingTimers.current[bookingId];
    setPendingActions((prev) => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  };

  const handleStatusChange = (bookingId, statusValue) => {
    if (statusValue === 'completed') {
      handleBookingStatusUpdate(bookingId, statusValue).then((result) => {
        if (result.ok) toast.success('Marked complete.');
        else toast.error(result.errorMessage);
      });
      return;
    }

    if (pendingTimers.current[bookingId]) cancelPending(bookingId);

    const label =
      statusValue === 'confirmed'
        ? 'Approving reservation…'
        : statusValue === 'cancelled'
          ? 'Declining reservation…'
          : `Updating…`;

    setPendingActions((prev) => ({ ...prev, [bookingId]: statusValue }));

    const toastId = toast(
      (t) => (
        <div className="flex items-center gap-3 text-sm">
          <span>{label}</span>
          <button
            type="button"
            className="font-semibold text-red-600 underline"
            onClick={() => {
              cancelPending(bookingId);
              toast.dismiss(t.id);
              toast('Cancelled.', { duration: 2000 });
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: UNDO_MS + 500, id: `bnb-status-${bookingId}` }
    );

    const timer = setTimeout(async () => {
      delete pendingTimers.current[bookingId];
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      toast.dismiss(toastId);
      const result = await handleBookingStatusUpdate(bookingId, statusValue);
      if (result.ok) {
        toast.success(
          statusValue === 'confirmed'
            ? 'Reservation approved.'
            : statusValue === 'cancelled'
              ? 'Reservation declined.'
              : `Booking ${statusValue}.`
        );
      } else {
        toast.error(result.errorMessage);
      }
    }, UNDO_MS);

    pendingTimers.current[bookingId] = { timer, toastId };
  };

  const today = todayKey();

  const bnbBookings = useMemo(
    () => bookings.filter((b) => b.booking_type === 'bnb' || b.bnb_listing_title || b.bnb_listing_id),
    [bookings]
  );

  const counts = useMemo(() => {
    const base = {
      all: bnbBookings.length,
      needs_response: 0,
      today: 0,
      this_week: 0,
      arriving_soon: 0,
      confirmed: 0,
      past: 0,
      cancelled: 0,
    };
    bnbBookings.forEach((b) => {
      STATUS_CHIPS.forEach((item) => {
        if (item.id !== 'all' && matchesFilter(b, item.id, today)) base[item.id] += 1;
      });
      WHEN_OPTIONS.forEach((item) => {
        if (matchesFilter(b, item.id, today)) base[item.id] += 1;
      });
      if (matchesFilter(b, 'arriving_soon', today)) base.arriving_soon += 1;
    });
    return base;
  }, [bnbBookings, today]);

  useEffect(() => {
    if (isLoading || defaultApplied) return;
    if (counts.needs_response > 0) setFilter('all');
    else if (counts.today > 0) setFilter('today');
    else if (counts.this_week > 0) setFilter('this_week');
    else setFilter('all');
    setDefaultApplied(true);
  }, [isLoading, defaultApplied, counts.needs_response, counts.today, counts.this_week]);

  const filtered = useMemo(() => {
    const query = bookingSearchQuery.trim().toLowerCase();
    let list = bnbBookings.filter((b) => matchesFilter(b, filter, today));
    if (query) {
      list = list.filter((b) =>
        `${b.guest_name || ''} ${b.hotel_name || ''} ${b.bnb_listing_title || ''}`.toLowerCase().includes(query)
      );
    }
    return [...list].sort((a, b) => {
      if (bookingSortBy === 'check_in_asc') return (a.check_in || '').localeCompare(b.check_in || '');
      if (bookingSortBy === 'check_in_desc') return (b.check_in || '').localeCompare(a.check_in || '');
      if (bookingSortBy === 'amount_desc') return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      if (bookingSortBy === 'amount_asc') return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      if (bookingSortBy === 'created_asc') return (a.created_at || '').localeCompare(b.created_at || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [bnbBookings, filter, today, bookingSearchQuery, bookingSortBy]);

  const needsResponse = useMemo(() => filtered.filter((b) => b.needsApproval), [filtered]);
  const upcoming = useMemo(
    () =>
      filtered.filter(
        (b) =>
          !b.needsApproval &&
          b.status !== 'cancelled' &&
          b.status !== 'completed' &&
          (b.check_out || b.check_in || '') >= today
      ),
    [filtered, today]
  );
  const showQueues = filter === 'all' && !bookingSearchQuery.trim() && bookingViewMode !== 'calendar';
  const hasData = bnbBookings.length > 0;

  const calendarBookingsByDate = useMemo(
    () =>
      filtered.reduce((acc, booking) => {
        const key = booking.check_in || '';
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push(booking);
        return acc;
      }, {}),
    [filtered]
  );

  const calendarGridDays = useMemo(() => {
    const year = calendarMonthCursor.getFullYear();
    const month = calendarMonthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOfGrid = new Date(firstDayOfMonth);
    startOfGrid.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return {
        iso,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        bookings: calendarBookingsByDate[iso] || [],
      };
    });
  }, [calendarBookingsByDate, calendarMonthCursor]);

  const selectedCalendarBookings = selectedCalendarDate
    ? calendarBookingsByDate[selectedCalendarDate] || []
    : [];

  const renderCardList = (list) => (
    <AnimatePresence mode="popLayout">
      {list.map((booking) => (
        <BnBReservationCard
          key={booking.id}
          booking={booking}
          formatCurrency={formatCurrency}
          actionLoadingId={bookingActionLoadingId}
          pendingAction={pendingActions[booking.id]}
          onView={setSelectedBooking}
          onStatusChange={handleStatusChange}
        />
      ))}
    </AnimatePresence>
  );

  return (
    <div className="space-y-5">
      {hasData && (
        <div className="flex items-center justify-end gap-2">
          <div className="inline-flex border border-gray-300" role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => setBookingViewMode('table')}
              className={`p-2 ${bookingViewMode !== 'calendar' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
              aria-pressed={bookingViewMode !== 'calendar'}
              aria-label="List view"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setBookingViewMode('calendar')}
              className={`p-2 ${bookingViewMode === 'calendar' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-800'}`}
              aria-pressed={bookingViewMode === 'calendar'}
              aria-label="Calendar view"
            >
              <CalendarDaysIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              aria-label="More actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 shadow-sm z-20 py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportCsv();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportExcel();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export Excel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loadError && (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {hasData && (
        <>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Reservation filters">
            {STATUS_CHIPS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                data-testid={`booking-filter-${item.id}`}
                onClick={() => setFilter(item.id)}
                className={`px-3 py-1.5 text-sm font-medium border ${
                  filter === item.id
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {item.label}
                {counts[item.id] > 0 ? ` (${counts[item.id]})` : ''}
              </button>
            ))}

            <div className="relative" ref={whenRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={whenOpen}
                data-testid="booking-filter-when"
                onClick={() => setWhenOpen((open) => !open)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border ${
                  WHEN_FILTER_IDS.has(filter)
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {WHEN_OPTIONS.find((o) => o.id === filter)?.label || 'Dates'}
                {WHEN_FILTER_IDS.has(filter) && counts[filter] > 0 ? ` (${counts[filter]})` : ''}
                <ChevronDownIcon className="w-3.5 h-3.5" aria-hidden />
              </button>
              {whenOpen && (
                <div
                  role="listbox"
                  aria-label="Filter by stay timing"
                  className="absolute left-0 mt-1 z-20 min-w-[11.5rem] bg-white border border-gray-200 shadow-sm py-1"
                >
                  {WHEN_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={filter === option.id}
                      data-testid={`booking-filter-${option.id}`}
                      onClick={() => {
                        setFilter(option.id);
                        setWhenOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        filter === option.id ? 'text-red-700 font-semibold bg-red-50' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                      {counts[option.id] > 0 ? (
                        <span className="text-gray-500 font-normal"> · {counts[option.id]}</span>
                      ) : null}
                    </button>
                  ))}
                  {WHEN_FILTER_IDS.has(filter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilter('all');
                        setWhenOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-500 border-t border-gray-100 hover:bg-gray-50"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
              <input
                type="search"
                value={bookingSearchQuery}
                onChange={(event) => setBookingSearchQuery(event.target.value)}
                placeholder="Search guests or listings…"
                aria-label="Search guests or listings"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <select
              value={bookingSortBy}
              onChange={(event) => setBookingSortBy(event.target.value)}
              aria-label="Sort reservations"
              className="px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="check_in_asc">Check-in (earliest)</option>
              <option value="check_in_desc">Check-in (latest)</option>
              <option value="amount_desc">Amount (high to low)</option>
              <option value="amount_asc">Amount (low to high)</option>
            </select>
          </div>
        </>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading reservations">
          {[1, 2, 3].map((row) => (
            <div key={row} className="animate-pulse border border-gray-200 bg-white p-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-100" />
                  <div className="h-3 w-56 bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-medium text-gray-900">No reservations yet</p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            When guests book your places, they’ll show up here for you to review and prepare.
          </p>
        </div>
      ) : bookingViewMode === 'calendar' ? (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="px-2 py-1 text-xs border border-gray-300 hover:bg-white"
                aria-label="Previous month"
              >
                Prev
              </button>
              <p className="text-sm font-semibold text-gray-800">
                {calendarMonthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="px-2 py-1 text-xs border border-gray-300 hover:bg-white"
                aria-label="Next month"
              >
                Next
              </button>
            </div>
            <div className="grid grid-cols-7 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="px-2 py-2 text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarGridDays.map((day) => {
                const isSelected = selectedCalendarDate === day.iso;
                return (
                  <button
                    type="button"
                    key={day.iso}
                    onClick={() => setSelectedCalendarDate(day.iso)}
                    aria-pressed={isSelected}
                    aria-label={`${day.iso}${day.bookings.length ? `, ${day.bookings.length} stays` : ''}`}
                    className={`h-16 sm:h-20 p-1.5 sm:p-2 border-b border-r border-gray-100 text-left ${
                      day.inCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-500'
                    } ${isSelected ? 'ring-2 ring-red-500 ring-inset bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <p className="text-xs font-medium">{day.dayNumber}</p>
                    {day.bookings.length ? (
                      <p className="mt-1 text-[10px] sm:text-[11px] text-red-700">
                        {day.bookings.length} stay{day.bookings.length > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              {selectedCalendarDate
                ? `Arrivals on ${new Date(selectedCalendarDate).toLocaleDateString()}`
                : 'Select a date'}
            </p>
            {selectedCalendarBookings.length
              ? renderCardList(selectedCalendarBookings)
              : selectedCalendarDate && (
                  <p className="text-sm text-gray-500 border border-dashed border-gray-200 p-6 text-center">
                    No check-ins on this date.
                  </p>
                )}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-base font-medium text-gray-900">Nothing in this view</p>
          <p className="mt-1 text-sm text-gray-500">Try another filter or clear your search.</p>
        </div>
      ) : showQueues ? (
        <div className="space-y-8">
          {needsResponse.length > 0 && (
            <section className="space-y-3" aria-labelledby="needs-response-heading">
              <h3 id="needs-response-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Needs your response ({needsResponse.length})
              </h3>
              <div className="space-y-2 sm:space-y-3">{renderCardList(needsResponse)}</div>
            </section>
          )}
          <section className="space-y-3" aria-labelledby="upcoming-heading">
            <h3 id="upcoming-heading" className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Upcoming
              {upcoming.length > 0 ? ` (${upcoming.length})` : ''}
            </h3>
            {upcoming.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">{renderCardList(upcoming)}</div>
            ) : (
              <p className="text-sm text-gray-500 border border-dashed border-gray-200 p-6 text-center">
                No upcoming stays right now.
              </p>
            )}
          </section>
          {filtered.some(
            (b) => b.status === 'cancelled' || b.status === 'completed' || (b.check_out && b.check_out < today)
          ) && (
            <section className="space-y-3" aria-labelledby="earlier-heading">
              <h3 id="earlier-heading" className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Earlier
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {renderCardList(
                  filtered.filter(
                    (b) =>
                      b.status === 'cancelled' ||
                      b.status === 'completed' ||
                      (b.check_out && b.check_out < today && !b.needsApproval)
                  )
                )}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">{renderCardList(filtered)}</div>
      )}

      <BnBReservationDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        formatCurrency={formatCurrency}
        formatStayDates={formatStayDates}
        nightsBetween={nightsBetween}
        arrivalLabel={(booking) => arrivalLabel(booking, today)}
        statusMeta={statusMeta}
        bookingActionLoadingId={bookingActionLoadingId}
        bookingActivityLog={bookingActivityLog}
        handleBookingStatusUpdate={handleStatusChange}
        getStatusColor={getStatusColor}
        timeAgo={timeAgo}
        onOpenAvailability={(booking) => {
          setSelectedBooking(null);
          onOpenAvailability?.(booking);
        }}
        onOpenHouseGuide={(booking) => {
          setSelectedBooking(null);
          onOpenHouseGuide?.(booking);
        }}
      />
    </div>
  );
};

export default BnBBookingsPanel;
