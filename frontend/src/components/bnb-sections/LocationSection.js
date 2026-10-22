import React, { useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import LocationPicker from '../onboarding/LocationPicker';
import { SectionCard, SaveButton, extractErrorMessage } from './shared';

const LocationSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [form, setForm] = useState({
    address: listing.address || '',
    city: listing.city || '',
    state_province: listing.state_province || '',
    country: listing.country || 'Kenya',
    postal_code: listing.postal_code || '',
    latitude: listing.latitude ?? '',
    longitude: listing.longitude ?? '',
  });
  const [saving, setSaving] = useState(false);

  const roundCoord = (v) => (v === '' || v == null ? null : Number(Number(v).toFixed(6)));
  const shortLabel = [form.city, form.country].filter(Boolean).join(', ');
  const mapHref =
    form.latitude !== '' && form.longitude !== '' && form.latitude != null && form.longitude != null
      ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}`
      : shortLabel
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [form.address, form.city, form.country].filter(Boolean).join(', ')
          )}`
        : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, {
        ...form,
        latitude: roundCoord(form.latitude),
        longitude: roundCoord(form.longitude),
      });
      onUpdated(updated);
      showSuccess('Saved', 'Location updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Location" description="Search an address or use your current location. Guests only see a short city link.">
      {shortLabel && mapHref && (
        <a
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
        >
          <MapPinIcon className="w-4 h-4" />
          {shortLabel}
        </a>
      )}
      <LocationPicker value={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} />
      <SaveButton onClick={handleSave} saving={saving} disabled={!form.city.trim()} sticky />
    </SectionCard>
  );
};

export default LocationSection;
