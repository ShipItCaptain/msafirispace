import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { promotionsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const PROMOTION_TYPES = [
  { value: 'trending', label: 'Trending Now' },
  { value: 'last_minute', label: 'Last Minute Deals' },
  { value: 'local_favorites', label: 'Local Favorites' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

const toDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const emptyForm = (hotelId) => ({
  hotel_id: hotelId || '',
  promotion_type: 'trending',
  title: '',
  description: '',
  original_price: '',
  discounted_price: '',
  discount_percentage: '',
  currency: 'KES',
  start_date: toDateTimeLocal(new Date().toISOString()),
  end_date: toDateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  status: 'active',
});

const PromotionsManager = ({ hotels }) => {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(hotels?.[0]?.id));
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadPromotions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await promotionsAPI.getPromotions({ provider: user.id });
      setPromotions(data?.results || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm(hotels?.[0]?.id));
    setShowForm(true);
  };

  const openEditForm = (promo) => {
    setEditingId(promo.id);
    setForm({
      hotel_id: promo.hotel,
      promotion_type: promo.promotion_type,
      title: promo.title,
      description: promo.description || '',
      original_price: String(promo.original_price),
      discounted_price: String(promo.discounted_price),
      discount_percentage: String(promo.discount_percentage),
      currency: promo.currency,
      start_date: toDateTimeLocal(promo.start_date),
      end_date: toDateTimeLocal(promo.end_date),
      status: promo.status,
    });
    setShowForm(true);
  };

  const handleFieldChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'original_price' || key === 'discounted_price') {
        const original = parseFloat(key === 'original_price' ? value : next.original_price);
        const discounted = parseFloat(key === 'discounted_price' ? value : next.discounted_price);
        if (original > 0 && discounted >= 0 && discounted <= original) {
          next.discount_percentage = String(Math.round(((original - discounted) / original) * 100));
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hotel_id) {
      toast.error('Select a hotel for this promotion');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        hotel_id: Number(form.hotel_id),
        original_price: parseFloat(form.original_price || 0),
        discounted_price: parseFloat(form.discounted_price || 0),
        discount_percentage: parseInt(form.discount_percentage || 0, 10),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      };
      if (editingId) {
        await promotionsAPI.updatePromotion(editingId, payload);
        toast.success('Promotion updated');
      } else {
        await promotionsAPI.createPromotion(payload);
        toast.success('Promotion created');
      }
      setShowForm(false);
      await loadPromotions();
    } catch (err) {
      const data = err?.response?.data;
      const message = data?.detail
        || (data && Object.values(data)[0]?.[0])
        || 'Could not save promotion';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await promotionsAPI.deletePromotion(id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      toast.success('Promotion deleted');
    } catch (_) {
      toast.error('Could not delete promotion');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading promotions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Promotions</h2>
          <p className="text-sm text-gray-500">Feature your hotel in Trending Now, Last Minute Deals, or Local Favorites.</p>
        </div>
        {!hotels?.length ? null : (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            New Promotion
          </button>
        )}
      </div>

      {!hotels?.length && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Add a hotel first, then come back here to create promotions for it.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel</label>
              <select
                value={form.hotel_id}
                onChange={(e) => handleFieldChange('hotel_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              >
                <option value="" disabled>Select a hotel</option>
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placement</label>
              <select
                value={form.promotion_type}
                onChange={(e) => handleFieldChange('promotion_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {PROMOTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Weekend Special"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
              <input
                type="number" min="0" step="0.01"
                value={form.original_price}
                onChange={(e) => handleFieldChange('original_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price</label>
              <input
                type="number" min="0" step="0.01"
                value={form.discounted_price}
                onChange={(e) => handleFieldChange('discounted_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
              <input
                type="number" min="1" max="100"
                value={form.discount_percentage}
                onChange={(e) => handleFieldChange('discount_percentage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starts</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ends</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Promotion'}
            </button>
          </div>
        </form>
      )}

      {promotions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No promotions yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {promotions.map((promo) => (
            <div key={promo.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{promo.title}</p>
                <p className="text-sm text-gray-500">
                  {PROMOTION_TYPES.find((t) => t.value === promo.promotion_type)?.label || promo.promotion_type}
                  {' · '}
                  {promo.currency} {Number(promo.discounted_price).toLocaleString()}
                  <span className="line-through text-gray-400 ml-1">{Number(promo.original_price).toLocaleString()}</span>
                  {' · '}
                  <span className={`capitalize ${promo.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                    {promo.status}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {promo.views_count} views &middot; {promo.clicks_count} clicks
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEditForm(promo)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  aria-label="Edit promotion"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(promo.id)}
                  disabled={deletingId === promo.id}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  aria-label="Delete promotion"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotionsManager;
