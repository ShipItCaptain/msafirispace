import React, { useState } from 'react';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { SectionCard, SaveButton, inputClasses, Stepper, extractErrorMessage } from './shared';

const PropertyDetailsSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [form, setForm] = useState({
    bedrooms: listing.bedrooms || 1,
    bathrooms: listing.bathrooms || 1,
    beds: listing.beds || 1,
    max_guests: listing.max_guests || 2,
    square_footage: listing.square_footage || '',
    number_of_units: listing.number_of_units || 1,
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, {
        bedrooms: parseInt(form.bedrooms, 10) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        beds: parseInt(form.beds, 10) || 1,
        max_guests: parseInt(form.max_guests, 10) || 1,
        square_footage: form.square_footage ? parseInt(form.square_footage, 10) : null,
        number_of_units: parseInt(form.number_of_units, 10) || 1,
      });
      onUpdated(updated);
      showSuccess('Saved', 'Property details updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Property details" description="Capacity and layout guests care about.">
      <div className="border border-gray-200 px-4 mb-5">
        <Stepper label="Guests" value={form.max_guests} min={1} max={30} onChange={(v) => set('max_guests', v)} />
        <Stepper label="Bedrooms" value={form.bedrooms} min={0} max={20} onChange={(v) => set('bedrooms', v)} />
        <Stepper label="Beds" value={form.beds} min={0} max={30} onChange={(v) => set('beds', v)} />
        <Stepper
          label="Bathrooms"
          value={form.bathrooms}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => set('bathrooms', v)}
        />
        <Stepper
          label="Units"
          value={form.number_of_units}
          min={1}
          max={50}
          onChange={(v) => set('number_of_units', v)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Square footage <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <input
          type="number"
          min="0"
          value={form.square_footage}
          onChange={(e) => set('square_footage', e.target.value)}
          className={inputClasses}
          placeholder="e.g. 85"
        />
      </div>
      <SaveButton onClick={handleSave} saving={saving} sticky />
    </SectionCard>
  );
};

export default PropertyDetailsSection;
