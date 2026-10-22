import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { SectionCard, SaveButton, inputClasses, Stepper, extractErrorMessage } from './shared';

const PricingSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const optionalMoney = (v) => (v === 0 || v === '0' || v === '0.00' || v == null ? '' : v);

  const [form, setForm] = useState({
    price_per_night: listing.price_per_night || '',
    cleaning_fee: optionalMoney(listing.cleaning_fee),
    security_deposit: optionalMoney(listing.security_deposit),
    minimum_nights: listing.minimum_nights || 1,
    maximum_nights: listing.maximum_nights || 30,
    check_in_time: (listing.check_in_time || '15:00:00').slice(0, 5),
    check_out_time: (listing.check_out_time || '11:00:00').slice(0, 5),
  });
  const [saving, setSaving] = useState(false);
  const [showExtras, setShowExtras] = useState(
    Boolean(Number(listing.cleaning_fee) || Number(listing.security_deposit))
  );

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const selectOnFocus = (e) => e.target.select();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, {
        price_per_night: parseFloat(form.price_per_night) || 0,
        cleaning_fee: parseFloat(form.cleaning_fee) || 0,
        security_deposit: parseFloat(form.security_deposit) || 0,
        minimum_nights: parseInt(form.minimum_nights, 10) || 1,
        maximum_nights: parseInt(form.maximum_nights, 10) || 30,
        check_in_time: `${form.check_in_time}:00`,
        check_out_time: `${form.check_out_time}:00`,
      });
      onUpdated(updated);
      showSuccess('Saved', 'Pricing updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  const nightly = Number(form.price_per_night) || 0;

  return (
    <SectionCard title="Pricing" description="Set what guests pay per night. Fees stay optional.">
      <div className="space-y-6">
        <div className="border border-gray-200 bg-gray-50 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Price per night *</label>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-gray-500">KSh</span>
            <input
              type="number"
              min="0"
              value={form.price_per_night}
              onChange={(e) => set('price_per_night', e.target.value)}
              onFocus={selectOnFocus}
              className="flex-1 text-3xl font-bold text-gray-900 bg-transparent border-0 border-b border-gray-300 focus:ring-0 focus:border-red-500 px-0 py-1"
              placeholder="0"
              aria-label="Price per night in Kenyan shillings"
            />
          </div>
          {nightly > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Guests will see about KSh {nightly.toLocaleString()} / night before fees.
            </p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowExtras((open) => !open)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-800 py-1"
            aria-expanded={showExtras}
          >
            <span>Optional fees</span>
            {showExtras ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          </button>
          {showExtras && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cleaning fee (KSh)</label>
                <input
                  type="number"
                  min="0"
                  value={form.cleaning_fee}
                  onChange={(e) => set('cleaning_fee', e.target.value)}
                  onFocus={selectOnFocus}
                  className={inputClasses}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Security deposit (KSh)</label>
                <input
                  type="number"
                  min="0"
                  value={form.security_deposit}
                  onChange={(e) => set('security_deposit', e.target.value)}
                  onFocus={selectOnFocus}
                  className={inputClasses}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border border-gray-200 px-4">
          <Stepper
            label="Minimum nights"
            value={form.minimum_nights}
            min={1}
            max={30}
            onChange={(v) => set('minimum_nights', v)}
          />
          <Stepper
            label="Maximum nights"
            value={form.maximum_nights}
            min={1}
            max={365}
            onChange={(v) => set('maximum_nights', v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
            <input
              type="time"
              value={form.check_in_time}
              onChange={(e) => set('check_in_time', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
            <input
              type="time"
              value={form.check_out_time}
              onChange={(e) => set('check_out_time', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>
      <SaveButton onClick={handleSave} saving={saving} sticky />
    </SectionCard>
  );
};

export default PricingSection;
