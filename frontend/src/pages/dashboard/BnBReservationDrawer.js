import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import MessageThread from '../../components/messaging/MessageThread';
import HostBookingActionButtons from './HostBookingActionButtons';

const checklistKey = (bookingId) => `bnb-prep-${bookingId}`;

const loadChecklist = (bookingId) => {
  try {
    return JSON.parse(localStorage.getItem(checklistKey(bookingId)) || '{}');
  } catch {
    return {};
  }
};

const saveChecklist = (bookingId, next) => {
  localStorage.setItem(checklistKey(bookingId), JSON.stringify(next));
};

const BnBReservationDrawer = ({
  booking,
  onClose,
  formatCurrency,
  formatStayDates,
  nightsBetween,
  arrivalLabel,
  statusMeta,
  bookingActionLoadingId,
  bookingActivityLog,
  handleBookingStatusUpdate,
  getStatusColor,
  timeAgo,
  onOpenAvailability,
  onOpenHouseGuide,
}) => {
  const [checklist, setChecklist] = useState(() => (booking ? loadChecklist(booking.id) : {}));
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    if (!booking) return undefined;
    setChecklist(loadChecklist(booking.id));
    setShowMessages(false);
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [booking, onClose]);

  const toggleCheck = (id) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklist(booking.id, next);
      return next;
    });
  };

  const markDone = (id) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: true };
      saveChecklist(booking.id, next);
      return next;
    });
  };

  if (!booking) return null;

  const meta = statusMeta(booking);
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const guestName = booking.guest_name || booking.guest_full_name || 'Guest';
  const listingTitle = booking.hotel_name || booking.bnb_listing_title || 'Your listing';
  const avatar = booking.traveler_avatar;
  const initial = (guestName.trim()[0] || 'G').toUpperCase();
  const showPrep = booking.status === 'confirmed' || booking.needsPayment;

  const prepItems = [
    {
      id: 'message',
      label: 'Message your guest',
      hint: 'Confirm arrival time or answer questions',
      icon: ChatBubbleLeftRightIcon,
      action: () => {
        setShowMessages(true);
        markDone('message');
      },
    },
    {
      id: 'guide',
      label: 'Share house guide',
      hint: 'Rules, Wi‑Fi, and check-in details',
      icon: DocumentTextIcon,
      action: () => {
        onOpenHouseGuide?.(booking);
        markDone('guide');
      },
    },
    {
      id: 'calendar',
      label: 'Review availability',
      hint: 'Block walk-ins that overlap this stay',
      icon: CalendarDaysIcon,
      action: () => {
        onOpenAvailability?.(booking);
        markDone('calendar');
      },
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        key="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-drawer-title"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.22 }}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
        data-testid="booking-detail-modal"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div className="flex gap-3 min-w-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-11 h-11 object-cover bg-gray-100" />
            ) : (
              <div className="w-11 h-11 bg-gray-100 text-gray-600 flex items-center justify-center font-semibold" aria-hidden>
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="reservation-drawer-title" className="text-lg font-bold text-gray-900 truncate">
                {guestName}
              </h2>
              <p className="text-sm text-gray-500 truncate">{listingTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close reservation details"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div className="space-y-2">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
            <p className="text-sm text-gray-800">
              {formatStayDates(booking.check_in, booking.check_out)}
              {nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
            </p>
            {arrivalLabel(booking) && (
              <p className="text-sm font-medium text-red-700">{arrivalLabel(booking)}</p>
            )}
            <p className="text-base font-semibold text-gray-900">
              {formatCurrency(booking.total_amount || 0)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900 break-all">
                {booking.guest_email || booking.traveler_email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{booking.guest_phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Payment</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {String(booking.payment_status || 'unpaid').replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </dd>
            </div>
          </dl>

          {showPrep && (
            <section aria-labelledby="prep-heading">
              <h3 id="prep-heading" className="text-sm font-semibold text-gray-900 mb-2">
                Prep for arrival
              </h3>
              <ul className="space-y-2">
                {prepItems.map((item) => {
                  const done = Boolean(checklist[item.id]);
                  return (
                    <li key={item.id}>
                      <div className="flex items-start gap-2 border border-gray-200 p-3">
                        <button
                          type="button"
                          onClick={() => toggleCheck(item.id)}
                          className={`mt-0.5 w-5 h-5 flex-shrink-0 border flex items-center justify-center ${
                            done ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300'
                          }`}
                          aria-pressed={done}
                          aria-label={`${done ? 'Unmark' : 'Mark'} ${item.label}`}
                        >
                          {done && <CheckIcon className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500">{item.hint}</p>
                          <button
                            type="button"
                            onClick={item.action}
                            className="mt-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Open
                          </button>
                        </div>
                        <item.icon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" aria-hidden />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(bookingActivityLog[booking.id] || booking.updated_at) && (
            <p className="text-xs text-gray-500">
              {bookingActivityLog[booking.id]
                ? `Last change: ${bookingActivityLog[booking.id].from || '—'} → ${bookingActivityLog[booking.id].to} (${timeAgo(bookingActivityLog[booking.id].at)})`
                : null}
              {booking.updated_at ? ` Updated ${timeAgo(booking.updated_at)}.` : ''}
            </p>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Actions</p>
            <HostBookingActionButtons
              booking={booking}
              bookingActionLoadingId={bookingActionLoadingId}
              onStatusChange={handleBookingStatusUpdate}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowMessages((open) => !open)}
              className="text-sm font-semibold text-gray-900 mb-2"
            >
              {showMessages ? 'Hide messages' : 'Messages'}
            </button>
            {showMessages && <MessageThread bookingId={booking.id} />}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default BnBReservationDrawer;
