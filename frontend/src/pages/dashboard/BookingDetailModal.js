import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import HostBookingActionButtons from './HostBookingActionButtons';
import MessageThread from '../../components/messaging/MessageThread';

const BookingDetailModal = ({
  selectedBooking,
  onClose,
  bookingActionLoadingId,
  bookingActivityLog,
  handleBookingStatusUpdate,
  getStatusColor,
  formatCurrency,
  timeAgo,
}) => {
  if (!selectedBooking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
          className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
          data-testid="booking-detail-modal"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
              <p className="text-sm text-gray-500">Booking #{selectedBooking.id}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Guest</p>
                <p className="font-medium text-gray-900">{selectedBooking.guest_full_name || selectedBooking.guest_name || 'Guest'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{selectedBooking.guest_email || selectedBooking.traveler_email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{selectedBooking.guest_phone || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Property</p>
                <p className="font-medium text-gray-900">{selectedBooking.hotel_name || 'Property'}</p>
              </div>
              <div>
                <p className="text-gray-500">Room</p>
                <p className="font-medium text-gray-900">{selectedBooking.room_name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium text-gray-900">{(selectedBooking.booking_type || 'hotel').toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-in</p>
                <p className="font-medium text-gray-900">{selectedBooking.check_in || selectedBooking.checkIn || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-out</p>
                <p className="font-medium text-gray-900">{selectedBooking.check_out || selectedBooking.checkOut || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="font-medium text-gray-900">{formatCurrency(selectedBooking.total_amount || selectedBooking.amount || 0)}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span data-testid="booking-detail-status" className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Payment Choice</p>
                <p className="font-medium text-gray-900">{selectedBooking.payment_method === 'online' ? 'Pay Now' : 'Pay at Hotel'}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment Status</p>
                <p className="font-medium text-gray-900">{String(selectedBooking.payment_status || 'unpaid').replace('_', ' ')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Request Stage</p>
                <p data-testid="booking-detail-request-stage" className="font-medium text-gray-900">{selectedBooking.requestStage || selectedBooking.status || 'pending'}</p>
              </div>
            </div>

            {(bookingActivityLog[selectedBooking.id] || selectedBooking.updated_at) && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                {bookingActivityLog[selectedBooking.id] ? (
                  <p>
                    Last status change: {bookingActivityLog[selectedBooking.id].from || 'pending'} -&gt; {bookingActivityLog[selectedBooking.id].to} by {bookingActivityLog[selectedBooking.id].by} ({timeAgo(bookingActivityLog[selectedBooking.id].at)})
                  </p>
                ) : null}
                {selectedBooking.updated_at ? (
                  <p className="mt-1">Booking updated {timeAgo(selectedBooking.updated_at)}.</p>
                ) : null}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Status Actions</p>
              <HostBookingActionButtons
                booking={selectedBooking}
                bookingActionLoadingId={bookingActionLoadingId}
                onStatusChange={handleBookingStatusUpdate}
              />
            </div>

            <MessageThread bookingId={selectedBooking.id} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingDetailModal;
