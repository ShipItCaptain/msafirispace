import React, { useState } from 'react';
import {
  CalendarDaysIcon,
  EllipsisHorizontalIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import HostBookingActionButtons from './HostBookingActionButtons';

const formatStayDates = (checkIn, checkOut) => {
  if (!checkIn) return 'Dates to be confirmed';
  const start = new Date(`${checkIn}T12:00:00`);
  const end = checkOut ? new Date(`${checkOut}T12:00:00`) : null;
  const options = { month: 'short', day: 'numeric' };
  if (Number.isNaN(start.getTime())) return `${checkIn} → ${checkOut || '—'}`;
  const from = start.toLocaleDateString(undefined, options);
  const to = end && !Number.isNaN(end.getTime()) ? end.toLocaleDateString(undefined, { ...options, year: 'numeric' }) : '—';
  return `${from} – ${to}`;
};

const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const nights = Math.round((end - start) / 86400000);
  return nights > 0 ? nights : null;
};

const statusMeta = (booking) => {
  if (booking.needsApproval) return { label: 'Needs response', className: 'bg-amber-50 text-amber-800' };
  if (booking.needsPayment) return { label: 'Awaiting payment', className: 'bg-orange-50 text-orange-800' };
  if (booking.status === 'confirmed') return { label: 'Confirmed', className: 'bg-green-50 text-green-800' };
  if (booking.status === 'cancelled') return { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' };
  if (booking.status === 'completed') return { label: 'Completed', className: 'bg-gray-100 text-gray-700' };
  return { label: booking.status || 'Pending', className: 'bg-gray-100 text-gray-700' };
};

const GuestAvatar = ({ booking }) => {
  const name = booking.guest_name || booking.guest_full_name || 'Guest';
  if (booking.traveler_avatar) return <img src={booking.traveler_avatar} alt="" className="h-11 w-11 flex-none object-cover bg-gray-100" />;
  return <div className="flex h-11 w-11 flex-none items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600" aria-hidden="true">{(name.trim()[0] || 'G').toUpperCase()}</div>;
};

const ReservationCard = ({ booking, formatCurrency, bookingActionLoadingId, onView, onStatusChange }) => {
  const meta = statusMeta(booking);
  const nights = nightsBetween(booking.check_in || booking.checkIn, booking.check_out || booking.checkOut);
  return <article data-testid="booking-row" className="flex flex-col gap-3 border border-gray-200 bg-white p-3 sm:flex-row sm:gap-4 sm:p-4">
    <button type="button" onClick={() => onView(booking)} className="flex min-w-0 flex-1 gap-3 text-left">
      <GuestAvatar booking={booking} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-gray-900 sm:text-base">{booking.guest_name || 'Guest'}</span><span className={`px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>{meta.label}</span></span>
        <span className="mt-0.5 block truncate text-xs text-gray-600 sm:text-sm">{booking.hotel_name || 'Your hotel'} · {booking.room_name || 'Room to be confirmed'}</span>
        <span className="mt-1 block text-xs text-gray-500 sm:text-sm">{formatStayDates(booking.check_in || booking.checkIn, booking.check_out || booking.checkOut)}{nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''} · {formatCurrency(booking.total_amount || booking.amount || 0)}</span>
        {booking.needsPayment && <span className="mt-1 block text-xs font-medium text-orange-700">Approved · waiting for guest payment</span>}
      </span>
    </button>
    <div className="pl-14 sm:flex sm:flex-none sm:items-center sm:pl-0"><HostBookingActionButtons booking={booking} bookingActionLoadingId={bookingActionLoadingId} onView={onView} onStatusChange={onStatusChange} /></div>
  </article>;
};

const HostDashboardBookingsTab = ({
  bookingViewMode, setBookingViewMode, exportFilteredBookingsCsv, exportFilteredBookingsExcel,
  bookingStatusFilter, setBookingStatusFilter, bookingStatusCounts, bookingSearchQuery,
  setBookingSearchQuery, bookingSortBy, setBookingSortBy, currentBookingPage, totalBookingPages,
  setBookingPage, sectionLoading, calendarMonthCursor, setCalendarMonthCursor, calendarGridDays,
  selectedCalendarDate, setSelectedCalendarDate, selectedCalendarBookings, bookingActionLoadingId,
  setSelectedBooking, handleBookingStatusUpdate, paginatedBookings, filteredBookings, formatCurrency,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const filters = [
    ['all', 'All'], ['awaiting_approval', 'Needs response'], ['awaiting_payment', 'Awaiting payment'],
    ['confirmed', 'Confirmed'], ['cancelled', 'Cancelled'],
  ];
  const hasBookings = bookingStatusCounts.all > 0;
  const renderCards = (bookings) => <div className="space-y-3">{bookings.map((booking) => <ReservationCard key={booking.id} booking={booking} formatCurrency={formatCurrency} bookingActionLoadingId={bookingActionLoadingId} onView={setSelectedBooking} onStatusChange={handleBookingStatusUpdate} />)}</div>;

  return <div className="space-y-5">
    {hasBookings && <div className="flex items-center justify-end gap-2"><div className="inline-flex border border-gray-300" role="group" aria-label="Reservation view mode"><button type="button" onClick={() => setBookingViewMode('table')} className={`p-2 ${bookingViewMode !== 'calendar' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-800'}`} aria-label="List view"><ListBulletIcon className="h-5 w-5" /></button><button type="button" onClick={() => setBookingViewMode('calendar')} className={`p-2 ${bookingViewMode === 'calendar' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:text-gray-800'}`} aria-label="Calendar view"><CalendarDaysIcon className="h-5 w-5" /></button></div><div className="relative"><button type="button" onClick={() => setMoreOpen((open) => !open)} className="border border-gray-300 p-2 text-gray-700 hover:bg-gray-50" aria-label="More reservation actions" aria-expanded={moreOpen}><EllipsisHorizontalIcon className="h-5 w-5" /></button>{moreOpen && <div className="absolute right-0 z-20 mt-1 w-40 border border-gray-200 bg-white py-1 shadow-sm"><button type="button" onClick={() => { exportFilteredBookingsCsv(); setMoreOpen(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Export CSV</button><button type="button" onClick={() => { exportFilteredBookingsExcel(); setMoreOpen(false); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Export Excel</button></div>}</div></div>}

    {bookingStatusCounts.awaiting_approval > 0 && bookingStatusFilter !== 'awaiting_approval' && <button type="button" onClick={() => setBookingStatusFilter('awaiting_approval')} className="flex w-full items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"><span><span className="block text-sm font-semibold text-amber-900">{bookingStatusCounts.awaiting_approval} reservation{bookingStatusCounts.awaiting_approval === 1 ? '' : 's'} need your response</span><span className="mt-0.5 block text-xs text-amber-800">Guests are waiting on confirmation.</span></span><span className="text-sm font-semibold text-amber-900">Review</span></button>}

    {hasBookings && <><div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Reservation filters">{filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={bookingStatusFilter === value} onClick={() => setBookingStatusFilter(value)} className={`border px-3 py-1.5 text-sm font-medium ${bookingStatusFilter === value ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>{label}{bookingStatusCounts[value] > 0 ? ` (${bookingStatusCounts[value]})` : ''}</button>)}</div><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input type="search" value={bookingSearchQuery} onChange={(event) => setBookingSearchQuery(event.target.value)} placeholder="Search guests or hotels…" className="w-full border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-red-500 focus:ring-red-500" /></div><select value={bookingSortBy} onChange={(event) => setBookingSortBy(event.target.value)} className="border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500" aria-label="Sort reservations"><option value="created_desc">Newest first</option><option value="created_asc">Oldest first</option><option value="check_in_asc">Check-in (earliest)</option><option value="check_in_desc">Check-in (latest)</option><option value="amount_desc">Amount (high to low)</option><option value="amount_asc">Amount (low to high)</option></select></div></>}

    {sectionLoading.bookings ? <div className="space-y-3" aria-busy="true">{[1, 2, 3].map((row) => <div key={row} className="animate-pulse border border-gray-200 bg-white p-4"><div className="flex gap-3"><div className="h-11 w-11 bg-gray-100" /><div className="flex-1 space-y-2"><div className="h-4 w-40 bg-gray-100" /><div className="h-3 w-56 bg-gray-100" /></div></div></div>)}</div> : !hasBookings ? <div className="border border-dashed border-gray-200 bg-white px-6 py-16 text-center"><p className="text-base font-semibold text-gray-900">No reservations yet</p><p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">When guests book your hotel, their reservation will appear here for you to review and prepare.</p></div> : bookingViewMode === 'calendar' ? <div className="space-y-4"><div className="overflow-hidden border border-gray-200 bg-white"><div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5"><button type="button" onClick={() => setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="border border-gray-300 px-2 py-1 text-xs hover:bg-white">Prev</button><p className="text-sm font-semibold text-gray-800">{calendarMonthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p><button type="button" onClick={() => setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="border border-gray-300 px-2 py-1 text-xs hover:bg-white">Next</button></div><div className="grid grid-cols-7 border-b border-gray-200 text-center text-[11px] uppercase tracking-wide text-gray-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-2 py-2">{day}</div>)}</div><div className="grid grid-cols-7">{calendarGridDays.map((day) => { const selected = selectedCalendarDate === day.iso; return <button key={day.iso} type="button" onClick={() => setSelectedCalendarDate(day.iso)} className={`h-16 border-b border-r border-gray-100 p-1.5 text-left sm:h-20 sm:p-2 ${day.inCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-500'} ${selected ? 'bg-red-50 ring-2 ring-inset ring-red-500' : 'hover:bg-gray-50'}`}><span className="text-xs font-medium">{day.dayNumber}</span>{day.bookings.length > 0 && <span className="mt-1 block text-[11px] text-red-700">{day.bookings.length} stay{day.bookings.length === 1 ? '' : 's'}</span>}</button>; })}</div></div><div className="space-y-3 border border-gray-200 bg-white p-4"><p className="text-sm font-semibold text-gray-900">{selectedCalendarDate ? `Reservations for ${new Date(`${selectedCalendarDate}T12:00:00`).toLocaleDateString()}` : 'Select a date to view reservations'}</p>{selectedCalendarBookings.length ? renderCards(selectedCalendarBookings) : <p className="py-4 text-sm text-gray-500">No check-ins on this date.</p>}</div></div> : <>{filteredBookings.length ? renderCards(paginatedBookings) : <div className="border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">No reservations match this filter.</div>}<div className="flex items-center justify-end gap-2 pt-1 text-sm"><button type="button" disabled={currentBookingPage <= 1} onClick={() => setBookingPage((page) => Math.max(page - 1, 1))} className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">Prev</button><span className="text-gray-600">Page {currentBookingPage} of {totalBookingPages}</span><button type="button" disabled={currentBookingPage >= totalBookingPages} onClick={() => setBookingPage((page) => Math.min(page + 1, totalBookingPages))} className="border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></>}
  </div>;
};

export default HostDashboardBookingsTab;
