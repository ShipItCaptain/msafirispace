import { useCallback, useMemo, useState } from 'react';
import { bookingsAPI } from '../../services/api';
import { normalizeHostBooking, normalizeHostBookings } from './hostDashboardUtils';
import { exportBookingsCsv, exportBookingsExcel } from './hostDashboardAnalytics';

export const getBookingStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatHostCurrency = (amount) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount || 0);

export const timeAgo = (value) => {
  if (!value) return 'just now';
  const then = new Date(value);
  const deltaMinutes = Math.max(Math.floor((Date.now() - then.getTime()) / 60000), 0);
  if (deltaMinutes < 1) return 'just now';
  if (deltaMinutes < 60) return `${deltaMinutes} min ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  return `${Math.floor(deltaHours / 24)}d ago`;
};

const BOOKINGS_PAGE_SIZE = 10;

/**
 * Encapsulates the booking list state (filter/search/sort/pagination/calendar)
 * and the approve/decline/complete action, shared by every host dashboard that
 * needs to manage bookings (hotel and BnB alike) via HostDashboardBookingsTab.
 */
export default function useHostBookingsController() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bookingViewMode, setBookingViewMode] = useState('table');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingSortBy, setBookingSortBy] = useState('created_desc');
  const [bookingPage, setBookingPage] = useState(1);
  const [calendarMonthCursor, setCalendarMonthCursor] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingActivityLog, setBookingActivityLog] = useState({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await bookingsAPI.getHostBookings();
      const normalized = normalizeHostBookings(response?.results || response || []);
      setBookings(normalized);
      setLastUpdatedAt(new Date());
      if (normalized.length) {
        const firstCheckIn = normalized[0].check_in || normalized[0].checkIn || '';
        if (firstCheckIn) {
          setSelectedCalendarDate(firstCheckIn);
          const parsed = new Date(firstCheckIn);
          if (!Number.isNaN(parsed.getTime())) {
            setCalendarMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
          }
        }
      }
      return normalized;
    } catch (err) {
      setLoadError('Failed to load bookings.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBookingStatusUpdate = useCallback(async (bookingId, statusValue) => {
    setBookingActionLoadingId(bookingId);
    try {
      const previous = bookings.find((booking) => booking.id === bookingId);
      const updatedResponse = await bookingsAPI.updateHostBookingStatus(bookingId, statusValue);
      const updated = normalizeHostBooking(updatedResponse);
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? updated : booking)));
      setSelectedBooking((prev) => (prev && prev.id === bookingId ? updated : prev));
      setBookingActivityLog((prev) => ({
        ...prev,
        [bookingId]: {
          from: previous?.status || null,
          to: statusValue,
          at: new Date().toISOString(),
        },
      }));
      return { ok: true, booking: updated };
    } catch (err) {
      return {
        ok: false,
        errorMessage: err?.response?.data?.detail || 'Failed to update booking status.',
      };
    } finally {
      setBookingActionLoadingId(null);
    }
  }, [bookings]);

  const bookingStatusCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    awaiting_approval: bookings.filter((booking) => booking.needsApproval).length,
    awaiting_payment: bookings.filter((booking) => booking.needsPayment).length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const statusFiltered = bookings.filter((booking) => (
      bookingStatusFilter === 'all'
      || (bookingStatusFilter === 'awaiting_approval' && booking.needsApproval)
      || (bookingStatusFilter === 'awaiting_payment' && booking.needsPayment)
      || booking.status === bookingStatusFilter
    ));

    const query = bookingSearchQuery.trim().toLowerCase();
    const searched = query
      ? statusFiltered.filter((booking) => (
          `${booking.guest_name || ''} ${booking.hotel_name || ''} ${booking.room_name || ''}`.toLowerCase().includes(query)
        ))
      : statusFiltered;

    return [...searched].sort((a, b) => {
      if (bookingSortBy === 'check_in_asc') return (a.check_in || '').localeCompare(b.check_in || '');
      if (bookingSortBy === 'check_in_desc') return (b.check_in || '').localeCompare(a.check_in || '');
      if (bookingSortBy === 'amount_desc') return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      if (bookingSortBy === 'amount_asc') return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      if (bookingSortBy === 'created_asc') return (a.created_at || '').localeCompare(b.created_at || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [bookings, bookingStatusFilter, bookingSearchQuery, bookingSortBy]);

  const totalBookingPages = Math.max(Math.ceil(filteredBookings.length / BOOKINGS_PAGE_SIZE), 1);
  const currentBookingPage = Math.min(bookingPage, totalBookingPages);
  const paginatedBookings = filteredBookings.slice(
    (currentBookingPage - 1) * BOOKINGS_PAGE_SIZE,
    currentBookingPage * BOOKINGS_PAGE_SIZE
  );

  const calendarBookingsByDate = useMemo(() => (
    filteredBookings.reduce((acc, booking) => {
      const key = booking.check_in || booking.checkIn || '';
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {})
  ), [filteredBookings]);

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

  const selectedCalendarBookings = useMemo(() => (
    selectedCalendarDate ? (calendarBookingsByDate[selectedCalendarDate] || []) : []
  ), [calendarBookingsByDate, selectedCalendarDate]);

  const exportCsv = useCallback(
    () => exportBookingsCsv(filteredBookings, {}),
    [filteredBookings]
  );
  const exportExcel = useCallback(
    () => exportBookingsExcel(filteredBookings, {}),
    [filteredBookings]
  );

  return {
    bookings,
    isLoading,
    loadError,
    loadBookings,
    lastUpdatedAt,

    bookingViewMode,
    setBookingViewMode,
    bookingStatusFilter,
    setBookingStatusFilter,
    bookingSearchQuery,
    setBookingSearchQuery,
    bookingSortBy,
    setBookingSortBy,
    bookingPage: currentBookingPage,
    setBookingPage,
    calendarMonthCursor,
    setCalendarMonthCursor,
    selectedCalendarDate,
    setSelectedCalendarDate,
    bookingActionLoadingId,
    selectedBooking,
    setSelectedBooking,
    bookingActivityLog,

    bookingStatusCounts,
    filteredBookings,
    paginatedBookings,
    totalBookingPages,
    calendarGridDays,
    selectedCalendarBookings,

    handleBookingStatusUpdate,
    exportCsv,
    exportExcel,
    getStatusColor: getBookingStatusColor,
    formatCurrency: formatHostCurrency,
    timeAgo,
  };
}
