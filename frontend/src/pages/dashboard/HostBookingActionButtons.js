import React from 'react';

const HostBookingActionButtons = ({
  booking,
  bookingActionLoadingId,
  onView,
  onStatusChange,
}) => {
  const isPending = booking.status === 'pending';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onView(booking)}
        className="px-2.5 py-1 text-xs rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        View
      </button>
      <button
        type="button"
        disabled={
          booking.status === 'confirmed' ||
          booking.status === 'cancelled' ||
          bookingActionLoadingId === booking.id
        }
        onClick={() => onStatusChange(booking.id, 'confirmed')}
        className="px-2.5 py-1 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {bookingActionLoadingId === booking.id ? 'Updating...' : isPending ? 'Approve Booking' : 'Confirm'}
      </button>
      <button
        type="button"
        disabled={
          booking.status === 'cancelled' ||
          booking.status === 'completed' ||
          bookingActionLoadingId === booking.id
        }
        onClick={() => onStatusChange(booking.id, 'cancelled')}
        className="px-2.5 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {bookingActionLoadingId === booking.id ? 'Updating...' : isPending ? 'Decline Booking' : 'Cancel'}
      </button>
      <button
        type="button"
        disabled={
          booking.status !== 'confirmed' ||
          bookingActionLoadingId === booking.id
        }
        onClick={() => onStatusChange(booking.id, 'completed')}
        className="px-2.5 py-1 text-xs rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {bookingActionLoadingId === booking.id ? 'Updating...' : 'Mark Complete'}
      </button>
    </div>
  );
};

export default HostBookingActionButtons;
