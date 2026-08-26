import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { bnbAPI } from '../../services/api';

const STATUS_STYLES = {
  available: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  occupied: 'bg-rose-50 border-rose-200 text-rose-800',
  maintenance: 'bg-amber-50 border-amber-200 text-amber-800',
  blocked: 'bg-gray-100 border-gray-300 text-gray-600',
  out_of_order: 'bg-slate-200 border-slate-300 text-slate-700',
};

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'out_of_order', label: 'Out of Order' },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

const AvailabilityCalendarModal = ({ bnbId, listingTitle, basePrice, currency = 'KES', onClose }) => {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editStatus, setEditStatus] = useState('available');
  const [editPrice, setEditPrice] = useState('');
  const [editMinStay, setEditMinStay] = useState(1);
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

  const openDay = (day) => {
    const dateKey = toDateKey(year, month, day);
    const entry = entries[dateKey];
    setSelectedDate(dateKey);
    setEditStatus(entry?.status || 'available');
    setEditPrice(entry?.price_override != null ? String(entry.price_override) : '');
    setEditMinStay(entry?.min_stay || 1);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    const existing = entries[selectedDate];
    const payload = {
      date: selectedDate,
      status: editStatus,
      price_override: editPrice === '' ? null : Number(editPrice),
      min_stay: Number(editMinStay) || 1,
    };
    try {
      const saved = existing
        ? await bnbAPI.updateAvailability(bnbId, existing.id, payload)
        : await bnbAPI.createAvailability(bnbId, payload);
      setEntries((prev) => ({ ...prev, [selectedDate]: saved }));
      toast.success('Availability updated');
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to save availability:', err);
      toast.error(err?.response?.data?.detail || 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedDate) return;
    const existing = entries[selectedDate];
    if (!existing) {
      setSelectedDate(null);
      return;
    }
    setSaving(true);
    try {
      await bnbAPI.deleteAvailability(bnbId, existing.id);
      setEntries((prev) => {
        const next = { ...prev };
        delete next[selectedDate];
        return next;
      });
      toast.success('Reset to default availability');
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to reset availability:', err);
      toast.error('Failed to reset date');
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
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
                const entry = entries[dateKey];
                const status = entry?.status || 'available';
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
                    } ${selectedDate === dateKey ? 'ring-2 ring-red-500' : ''}`}
                  >
                    <span className="font-semibold">{day}</span>
                    {entry?.price_override && !past && (
                      <span className="text-[10px]">
                        {currency} {Number(entry.price_override).toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-600">
            {STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded border ${STATUS_STYLES[opt.value]}`} />
                {opt.label}
              </div>
            ))}
          </div>

          {selectedDate && (
            <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <h5 className="font-semibold text-gray-900 mb-3">{selectedDate}</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price override ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={basePrice ? String(basePrice) : 'Default'}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min stay (nights)</label>
                  <input
                    type="number"
                    min="1"
                    value={editMinStay}
                    onChange={(e) => setEditMinStay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                {entries[selectedDate] && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    Reset to default
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="ml-auto px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendarModal;
