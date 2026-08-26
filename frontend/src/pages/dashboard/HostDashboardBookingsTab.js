import React from 'react';
import HostBookingActionButtons from './HostBookingActionButtons';

const HostDashboardBookingsTab = ({
  bookingViewMode,
  setBookingViewMode,
  exportFilteredBookingsCsv,
  exportFilteredBookingsExcel,
  bookingStatusFilter,
  setBookingStatusFilter,
  bookingStatusCounts,
  bookingSearchQuery,
  setBookingSearchQuery,
  bookingSortBy,
  setBookingSortBy,
  currentBookingPage,
  totalBookingPages,
  setBookingPage,
  sectionLoading,
  calendarMonthCursor,
  setCalendarMonthCursor,
  calendarGridDays,
  selectedCalendarDate,
  setSelectedCalendarDate,
  selectedCalendarBookings,
  bookingActionLoadingId,
  setSelectedBooking,
  handleBookingStatusUpdate,
  paginatedBookings,
  filteredBookings,
  getStatusColor,
  formatCurrency,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Bookings Management</h2>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={exportFilteredBookingsCsv}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={exportFilteredBookingsExcel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export Excel
        </button>
        <button
          type="button"
          onClick={() => setBookingViewMode((prev) => (prev === 'table' ? 'calendar' : 'table'))}
          className={`px-4 py-2 rounded-lg transition-colors ${
            bookingViewMode === 'calendar'
              ? 'bg-blue-700 text-white hover:bg-blue-800'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {bookingViewMode === 'calendar' ? 'Table View' : 'Calendar View'}
        </button>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['awaiting_approval', 'Awaiting Approval'],
            ['awaiting_payment', 'Awaiting Payment'],
            ['confirmed', 'Confirmed'],
            ['cancelled', 'Cancelled'],
            ['completed', 'Completed'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              data-testid={`booking-filter-${value}`}
              onClick={() => setBookingStatusFilter(value)}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                bookingStatusFilter === value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label} ({bookingStatusCounts[value] || 0})
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={bookingSearchQuery}
            onChange={(event) => setBookingSearchQuery(event.target.value)}
            placeholder="Search by guest, hotel, room..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={bookingSortBy}
            onChange={(event) => setBookingSortBy(event.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="created_desc">Newest created</option>
            <option value="created_asc">Oldest created</option>
            <option value="check_in_asc">Check-in (earliest)</option>
            <option value="check_in_desc">Check-in (latest)</option>
            <option value="amount_desc">Amount (high to low)</option>
            <option value="amount_asc">Amount (low to high)</option>
          </select>
          <div className="flex items-center justify-end gap-2 text-sm">
            <button
              type="button"
              disabled={currentBookingPage <= 1}
              onClick={() => setBookingPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-gray-600">Page {currentBookingPage} / {totalBookingPages}</span>
            <button
              type="button"
              disabled={currentBookingPage >= totalBookingPages}
              onClick={() => setBookingPage((prev) => Math.min(prev + 1, totalBookingPages))}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {bookingViewMode === 'calendar' ? (
        <div className="p-4 space-y-4">
          {sectionLoading.bookings && [1, 2, 3].map((row) => (
            <div key={`calendar-skeleton-${row}`} className="animate-pulse p-4 border border-gray-200 rounded-xl">
              <div className="h-4 w-32 bg-gray-100 rounded mb-3" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
          {!sectionLoading.bookings && (
            <>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-white"
                  >
                    Prev
                  </button>
                  <p className="text-sm font-semibold text-gray-800">
                    {calendarMonthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCalendarMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-white"
                  >
                    Next
                  </button>
                </div>
                <div className="grid grid-cols-7 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="px-2 py-2 text-center">{day}</div>
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
                        className={`h-20 p-2 border-b border-r border-gray-100 text-left transition-colors ${
                          day.inCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                        } ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <p className="text-xs font-medium">{day.dayNumber}</p>
                        {day.bookings.length ? (
                          <p className="mt-1 text-[11px] text-blue-700">{day.bookings.length} booking{day.bookings.length > 1 ? 's' : ''}</p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-3 space-y-2.5">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedCalendarDate
                    ? `Bookings for ${new Date(selectedCalendarDate).toLocaleDateString()}`
                    : 'Select a date to view bookings'}
                </p>
                {selectedCalendarBookings.map((booking) => (
                  <div key={`calendar-booking-${booking.id}`} className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{booking.guest_name || 'Guest'}</p>
                        <p className="text-xs text-gray-600">{booking.hotel_name || 'Property'} • {booking.room_name || '—'}</p>
                        <p className="text-xs text-gray-500">
                          {booking.check_in || booking.checkIn || '—'} → {booking.check_out || booking.checkOut || '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(booking.total_amount || booking.amount || 0)}</p>
                        <span className={`inline-flex mt-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <HostBookingActionButtons
                        booking={booking}
                        bookingActionLoadingId={bookingActionLoadingId}
                        onView={setSelectedBooking}
                        onStatusChange={handleBookingStatusUpdate}
                      />
                    </div>
                  </div>
                ))}
                {selectedCalendarDate && selectedCalendarBookings.length === 0 ? (
                  <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-4">
                    No check-ins on this date.
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : (
      <>
      <div className="md:hidden p-3 space-y-3">
        {sectionLoading.bookings && [1, 2, 3].map((row) => (
          <div key={`mobile-skeleton-${row}`} className="animate-pulse p-4 border border-gray-200 rounded-xl">
            <div className="h-4 bg-gray-100 rounded mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
        {!sectionLoading.bookings && paginatedBookings.map((booking) => (
          <div key={`mobile-${booking.id}`} className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">{booking.guest_name || 'Guest'}</p>
                <p className="text-xs text-gray-600">{booking.hotel_name || 'Property'}</p>
                <p className="text-xs text-gray-500">{booking.room_name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(booking.total_amount || booking.amount || 0)}</p>
                <span className={`inline-flex mt-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`inline-flex px-2 py-1 rounded-full font-medium ${booking.needsApproval ? 'bg-blue-100 text-blue-700' : booking.needsPayment ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                {booking.requestStage}
              </span>
              <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                {booking.payment_method === 'online' ? 'Pay Now' : 'Pay at Hotel'}
              </span>
              <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                {String(booking.payment_status || 'unpaid').replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-gray-500">Check-in</span>
              <span className="text-gray-900 text-right">{booking.check_in || booking.checkIn || '—'}</span>
              <span className="text-gray-500">Check-out</span>
              <span className="text-gray-900 text-right">{booking.check_out || booking.checkOut || '—'}</span>
            </div>
            <HostBookingActionButtons
              booking={booking}
              bookingActionLoadingId={bookingActionLoadingId}
              onView={setSelectedBooking}
              onStatusChange={handleBookingStatusUpdate}
            />
          </div>
        ))}
        {!sectionLoading.bookings && filteredBookings.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">No bookings in this status.</div>
        )}
      </div>

      <div className="hidden md:block max-h-[560px] overflow-auto relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-[inset_0_-1px_0_0_rgb(229,231,235)]">
            <tr>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Stage</th>
              <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sectionLoading.bookings && [1, 2, 3, 4].map((row) => (
              <tr key={`skeleton-${row}`} className="animate-pulse">
                <td className="px-6 py-4" colSpan={9}>
                  <div className="h-5 bg-gray-100 rounded" />
                </td>
              </tr>
            ))}
            {!sectionLoading.bookings && paginatedBookings.map((booking) => (
              <tr key={booking.id} data-testid="booking-row" className="hover:bg-gray-50">
                <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.guest_name || 'Guest'}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {booking.hotel_name || 'Property'}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {booking.room_name || '—'}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {booking.check_in || booking.checkIn || '—'}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500">
                  {booking.check_out || booking.checkOut || '—'}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(booking.total_amount || booking.amount || 0)}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex px-2 py-1 rounded-full font-medium ${booking.needsApproval ? 'bg-blue-100 text-blue-700' : booking.needsPayment ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.requestStage}
                    </span>
                    <span className="text-gray-500">
                      {booking.payment_method === 'online' ? 'Pay Now' : 'Pay at Hotel'} • {String(booking.payment_status || 'unpaid').replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-sm font-medium">
                  <HostBookingActionButtons
                    booking={booking}
                    bookingActionLoadingId={bookingActionLoadingId}
                    onView={setSelectedBooking}
                    onStatusChange={handleBookingStatusUpdate}
                  />
                </td>
              </tr>
            ))}
            {!sectionLoading.bookings && filteredBookings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                  No bookings in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  </div>
);

export default HostDashboardBookingsTab;
