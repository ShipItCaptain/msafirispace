import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import HostDashboardBookingsTab from './HostDashboardBookingsTab';
import BookingDetailModal from './BookingDetailModal';
import useHostBookingsController from './useHostBookingsController';

const BnBBookingsPanel = () => {
  const controller = useHostBookingsController();
  const {
    isLoading,
    loadError,
    loadBookings,
    bookingStatusCounts,
    handleBookingStatusUpdate,
    setBookingStatusFilter,
    selectedBooking,
    setSelectedBooking,
  } = controller;

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (bookingId, statusValue) => {
    const result = await handleBookingStatusUpdate(bookingId, statusValue);
    if (result.ok) {
      toast.success(`Booking ${statusValue} successfully.`);
    } else {
      toast.error(result.errorMessage);
    }
  };

  const awaitingApprovalCount = bookingStatusCounts.awaiting_approval;

  return (
    <div className="space-y-6">
      {!isLoading && awaitingApprovalCount > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BellAlertIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">
                {awaitingApprovalCount} reservation request{awaitingApprovalCount > 1 ? 's' : ''} waiting for your confirmation
              </p>
              <p className="text-sm text-blue-700">
                Guests are waiting to know if their dates are available before they can pay.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBookingStatusFilter('awaiting_approval')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex-shrink-0"
          >
            Review Requests
          </button>
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      <HostDashboardBookingsTab
        bookingViewMode={controller.bookingViewMode}
        setBookingViewMode={controller.setBookingViewMode}
        exportFilteredBookingsCsv={controller.exportCsv}
        exportFilteredBookingsExcel={controller.exportExcel}
        bookingStatusFilter={controller.bookingStatusFilter}
        setBookingStatusFilter={controller.setBookingStatusFilter}
        bookingStatusCounts={controller.bookingStatusCounts}
        bookingSearchQuery={controller.bookingSearchQuery}
        setBookingSearchQuery={controller.setBookingSearchQuery}
        bookingSortBy={controller.bookingSortBy}
        setBookingSortBy={controller.setBookingSortBy}
        currentBookingPage={controller.bookingPage}
        totalBookingPages={controller.totalBookingPages}
        setBookingPage={controller.setBookingPage}
        sectionLoading={{ bookings: isLoading }}
        calendarMonthCursor={controller.calendarMonthCursor}
        setCalendarMonthCursor={controller.setCalendarMonthCursor}
        calendarGridDays={controller.calendarGridDays}
        selectedCalendarDate={controller.selectedCalendarDate}
        setSelectedCalendarDate={controller.setSelectedCalendarDate}
        selectedCalendarBookings={controller.selectedCalendarBookings}
        bookingActionLoadingId={controller.bookingActionLoadingId}
        setSelectedBooking={setSelectedBooking}
        handleBookingStatusUpdate={handleStatusChange}
        paginatedBookings={controller.paginatedBookings}
        filteredBookings={controller.filteredBookings}
        getStatusColor={controller.getStatusColor}
        formatCurrency={controller.formatCurrency}
      />

      <BookingDetailModal
        selectedBooking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        bookingActionLoadingId={controller.bookingActionLoadingId}
        bookingActivityLog={controller.bookingActivityLog}
        handleBookingStatusUpdate={handleStatusChange}
        getStatusColor={controller.getStatusColor}
        formatCurrency={controller.formatCurrency}
        timeAgo={controller.timeAgo}
      />
    </div>
  );
};

export default BnBBookingsPanel;
