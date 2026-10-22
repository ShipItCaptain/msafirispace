import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { bnbAPI, bookingsAPI } from '../../services/api';

const STATUS_STYLES = {
  available: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  occupied: 'bg-rose-50 border-rose-200 text-rose-800',
  maintenance: 'bg-amber-50 border-amber-200 text-amber-800',
  blocked: 'bg-gray-100 border-gray-300 text-gray-600',
  out_of_order: 'bg-slate-200 border-slate-300 text-slate-700',
};

const LEGEND = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Booked / reserved' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'maintenance', label: 'Maintenance' },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

const eachNight = (checkIn, checkOut) => {
  const nights = [];
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    nights.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return nights;
};

const addDays = (dateKey, days) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nightsFromStart = (startDate, nightCount) => {
  const keys = [];
  for (let i = 0; i < nightCount; i += 1) keys.push(addDays(startDate, i));
  return keys;
};

const paymentLabel = (booking) => {
  if (!booking) return null;
  if (booking.payment_status === 'paid') return 'Booked and paid';
  if (booking.payment_status === 'partially_paid') return 'Reserved — partially paid';
  if (booking.payment_status === 'pending_payment') return 'Reserved — waiting for payment';
  if (booking.payment_status === 'unpaid') return 'Reserved — not paid yet';
  if (booking.payment_status === 'refunded') return 'Refunded';
  return 'Reserved';
};

const AvailabilityCalendarModal = ({ bnbId, listingTitle, basePrice, currency = 'KES', onClose }) => {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState({});
  const [bookingsByDate, setBookingsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestPaid, setGuestPaid] = useState(false);
  const [nights, setNights] = useState(1);
  const [saving, setSaving] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const start = toDateKey(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = toDateKey(year, month, lastDay);
    try {
      let page = 1;
      let all = [];
      for (let i = 0; i < 5; i += 1) {
        const data = await bnbAPI.getAvailability(bnbId, { start_date: start, end_date: end, page });
        const list = data?.results || (Array.isArray(data) ? data : []);
        all = all.concat(list);
        if (!data?.next) break;
        page += 1;
      }
      const map = {};
      all.forEach((entry) => {
        map[entry.date] = entry;
      });
      setEntries(map);

      const bookingMap = {};
      try {
        const bookingData = await bookingsAPI.getHostBookings();
        const list = bookingData?.results || (Array.isArray(bookingData) ? bookingData : []);
        list
          .filter((b) => b.bnb_listing_id === bnbId && b.status !== 'cancelled')
          .forEach((booking) => {
            eachNight(booking.check_in, booking.check_out).forEach((dateKey) => {
              if (dateKey >= start && dateKey <= end) {
                bookingMap[dateKey] = booking;
              }
            });
          });
      } catch (_) {
        // Calendar still works without booking overlay.
      }
      setBookingsByDate(bookingMap);
    } catch (err) {
      console.error('Failed to load availability:', err);
      toast.error('Failed to load availability calendar');
    } finally {
      setLoading(false);
    }
  }, [bnbId, year, month]);

  useEffect(() => {
    loadMonth();
    setSelectedDate(null);
  }, [loadMonth]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const isPast = (day) => {
    const d = new Date(year, month, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  const dayStatus = (dateKey) => {
    if (bookingsByDate[dateKey]) return 'occupied';
    return entries[dateKey]?.status || 'available';
  };

  const openDay = (day) => {
    setSelectedDate(toDateKey(year, month, day));
    setGuestName('');
    setGuestPaid(false);
    setNights(1);
  };

  const closeDayPanel = () => {
    setSelectedDate(null);
    setGuestName('');
    setGuestPaid(false);
    setNights(1);
  };

  const upsertAvailability = async (dateKey, payload) => {
    const existing = entries[dateKey];
    const saved = existing
      ? await bnbAPI.updateAvailability(bnbId, existing.id, { date: dateKey, ...payload })
      : await bnbAPI.createAvailability(bnbId, { date: dateKey, ...payload });
    setEntries((prev) => ({ ...prev, [dateKey]: saved }));
    return saved;
  };

  const applyToNights = async (payload, { nightCount = 1 } = {}) => {
    const dates = nightsFromStart(selectedDate, nightCount);
    const conflict = dates.find((dateKey) => {
      if (bookingsByDate[dateKey]) return true;
      const status = entries[dateKey]?.status;
      return status && status !== 'available';
    });
    if (conflict) {
      throw new Error(`Night of ${conflict} is already booked, reserved, or blocked.`);
    }
    for (const dateKey of dates) {
      // eslint-disable-next-line no-await-in-loop
      await upsertAvailability(dateKey, payload);
    }
    return dates;
  };

  const handleManualReserve = async () => {
    if (!selectedDate) return;
    const nightCount = Math.max(1, Number(nights) || 1);
    setSaving(true);
    try {
      const dates = await applyToNights(
        {
          status: 'occupied',
          price_override: null,
          min_stay: 1,
          walk_in_guest_name: guestName.trim(),
          walk_in_paid: guestPaid,
        },
        { nightCount }
      );
      const checkout = addDays(selectedDate, nightCount);
      toast.success(
        guestName.trim()
          ? `Reserved ${nightCount} night${nightCount > 1 ? 's' : ''} for ${guestName.trim()} (${selectedDate} → ${checkout})`
          : `Reserved ${nightCount} night${nightCount > 1 ? 's' : ''} (${selectedDate} → ${checkout})`
      );
      closeDayPanel();
      return dates;
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.detail || 'Could not reserve dates');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!selectedDate) return;
    const nightCount = Math.max(1, Number(nights) || 1);
    setSaving(true);
    try {
      await applyToNights(
        {
          status: 'blocked',
          price_override: null,
          min_stay: 1,
          walk_in_guest_name: '',
          walk_in_paid: false,
        },
        { nightCount }
      );
      toast.success(`Blocked ${nightCount} night${nightCount > 1 ? 's' : ''}`);
      closeDayPanel();
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.detail || 'Could not block dates');
    } finally {
      setSaving(false);
    }
  };

  const handleFreeDate = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const guest = (entries[selectedDate]?.walk_in_guest_name || '').trim();
      const status = entries[selectedDate]?.status;
      let datesToFree = [selectedDate];

      if (status === 'occupied') {
        let start = selectedDate;
        let end = selectedDate;
        while (true) {
          const prev = addDays(start, -1);
          const entry = entries[prev];
          if (!entry || entry.status !== 'occupied') break;
          if ((entry.walk_in_guest_name || '').trim() !== guest) break;
          start = prev;
        }
        while (true) {
          const next = addDays(end, 1);
          const entry = entries[next];
          if (!entry || entry.status !== 'occupied') break;
          if ((entry.walk_in_guest_name || '').trim() !== guest) break;
          end = next;
        }
        datesToFree = eachNight(start, addDays(end, 1));
      }

      for (const dateKey of datesToFree) {
        const existing = entries[dateKey];
        if (!existing) continue;
        // eslint-disable-next-line no-await-in-loop
        await bnbAPI.deleteAvailability(bnbId, existing.id);
      }
      setEntries((prev) => {
        const next = { ...prev };
        datesToFree.forEach((dateKey) => {
          delete next[dateKey];
        });
        return next;
      });
      toast.success(
        datesToFree.length > 1
          ? `${datesToFree.length} nights are available again`
          : 'Date is available again'
      );
      closeDayPanel();
    } catch (err) {
      toast.error('Could not free this date');
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedBooking = selectedDate ? bookingsByDate[selectedDate] : null;
  const selectedEntry = selectedDate ? entries[selectedDate] : null;
  const selectedStatus = selectedDate ? dayStatus(selectedDate) : null;
  const nightCount = Math.max(1, Number(nights) || 1);
  const checkoutDate = selectedDate ? addDays(selectedDate, nightCount) : '';
  const prettyDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Expand a walk-in stay across consecutive occupied nights with the same guest.
  const walkInStayRange = (() => {
    if (!selectedDate || !selectedEntry || selectedEntry.status !== 'occupied') return null;
    const guest = (selectedEntry.walk_in_guest_name || '').trim();
    let start = selectedDate;
    let end = selectedDate;
    while (true) {
      const prev = addDays(start, -1);
      const entry = entries[prev];
      if (!entry || entry.status !== 'occupied') break;
      if ((entry.walk_in_guest_name || '').trim() !== guest) break;
      start = prev;
    }
    while (true) {
      const next = addDays(end, 1);
      const entry = entries[next];
      if (!entry || entry.status !== 'occupied') break;
      if ((entry.walk_in_guest_name || '').trim() !== guest) break;
      end = next;
    }
    const checkout = addDays(end, 1);
    const totalNights = eachNight(start, checkout).length;
    return { start, end, checkout, totalNights, guest };
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Manage Availability</h3>
            <p className="text-sm text-gray-500">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-semibold text-gray-900">{monthLabel}</h4>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const dateKey = toDateKey(year, month, day);
                const status = dayStatus(dateKey);
                const past = isPast(day);
                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={past}
                    onClick={() => openDay(day)}
                    className={`aspect-square rounded-lg border text-xs p-1 flex flex-col items-center justify-center transition-colors ${
                      past
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                        : `${STATUS_STYLES[status]} hover:opacity-80`
                    }`}
                  >
                    <span className="font-semibold">{day}</span>
                    {entries[dateKey]?.price_override && !past && (
                      <span className="text-[10px]">
                        {currency} {Number(entries[dateKey].price_override).toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-600">
            {LEGEND.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded border ${STATUS_STYLES[opt.value]}`} />
                {opt.label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Tap a date to reserve for a walk-in guest, block it, or see booking payment status.
          </p>
        </div>

        {/* Date action overlay */}
        {selectedDate && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4 rounded-2xl"
            onClick={closeDayPanel}
          >
            <div
              className="w-full max-w-xs rounded-xl bg-white shadow-2xl border border-gray-100 p-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Manage ${prettyDate}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm font-medium text-gray-900">{prettyDate}</p>
                <button
                  type="button"
                  onClick={closeDayPanel}
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {selectedBooking ? (
                <div className="space-y-3">
                  <div className="space-y-1 text-xs text-gray-600 leading-relaxed">
                    <p>
                      <span className="text-gray-400">Guest · </span>
                      {selectedBooking.guest_full_name || selectedBooking.traveler_name || 'Guest'}
                    </p>
                    <p>
                      <span className="text-gray-400">Dates · </span>
                      {selectedBooking.check_in} → {selectedBooking.check_out}
                    </p>
                    <p>
                      <span className="text-gray-400">Status · </span>
                      {paymentLabel(selectedBooking)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDayPanel}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              ) : selectedStatus === 'available' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Check-in {selectedDate} · {currency} {Number(basePrice || 0).toLocaleString()}/night
                  </p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nights</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={nights}
                      onChange={(e) => setNights(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      {nightCount} night{nightCount > 1 ? 's' : ''} · checkout {checkoutDate}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Guest name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="walk-in-payment"
                        checked={!guestPaid}
                        onChange={() => setGuestPaid(false)}
                        className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-gray-700">Reserved</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="walk-in-payment"
                        checked={guestPaid}
                        onChange={() => setGuestPaid(true)}
                        className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-gray-700">Paid</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualReserve}
                    disabled={saving}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : `Reserve ${nightCount} night${nightCount > 1 ? 's' : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={saving}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Block {nightCount} night{nightCount > 1 ? 's' : ''}
                  </button>
                </div>
              ) : selectedEntry?.status === 'occupied' ? (
                <div className="space-y-3">
                  <div className="space-y-1 text-xs text-gray-600 leading-relaxed">
                    <p>
                      <span className="text-gray-400">Guest · </span>
                      {walkInStayRange?.guest || selectedEntry.walk_in_guest_name?.trim() || 'Walk-in guest'}
                    </p>
                    <p>
                      <span className="text-gray-400">Dates · </span>
                      {walkInStayRange
                        ? `${walkInStayRange.start} → ${walkInStayRange.checkout} (${walkInStayRange.totalNights} night${walkInStayRange.totalNights > 1 ? 's' : ''})`
                        : selectedDate}
                    </p>
                    <p>
                      <span className="text-gray-400">Status · </span>
                      {selectedEntry.walk_in_paid ? 'Paid' : 'Reserved (not paid)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFreeDate}
                    disabled={saving}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving
                      ? 'Updating...'
                      : walkInStayRange?.totalNights > 1
                        ? `Free all ${walkInStayRange.totalNights} nights`
                        : 'Make available again'}
                  </button>
                  <button
                    type="button"
                    onClick={closeDayPanel}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 capitalize">
                    {(selectedEntry?.status || 'unavailable').replace('_', ' ')} · guests cannot book this date
                  </p>
                  <button
                    type="button"
                    onClick={handleFreeDate}
                    disabled={saving}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving ? 'Updating...' : 'Make available again'}
                  </button>
                  <button
                    type="button"
                    onClick={closeDayPanel}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityCalendarModal;
