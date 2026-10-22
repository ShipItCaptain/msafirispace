import React, { useState } from 'react';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { propertyTypes } from '../../utils/bnbOptions';
import { SectionCard, SaveButton, inputClasses, ToggleChip, extractErrorMessage } from './shared';

const TITLE_SOFT_MAX = 50;
const DESC_SOFT_MAX = 500;

const BasicInfoSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [form, setForm] = useState({
    title: listing.title || '',
    property_type: listing.property_type || 'apartment',
    description: listing.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, form);
      onUpdated(updated);
      showSuccess('Saved', 'Basic info updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  const titleLen = form.title.trim().length;
  const descLen = form.description.trim().length;

  return (
    <SectionCard title="Title & type" description="How guests first recognize your place.">
      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">Listing title *</label>
            <span className={`text-xs ${titleLen > TITLE_SOFT_MAX ? 'text-amber-600' : 'text-gray-400'}`}>
              {titleLen}/{TITLE_SOFT_MAX}
            </span>
          </div>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className={inputClasses}
            placeholder="e.g. Bright studio near town"
            maxLength={80}
          />
          <p className="mt-1 text-xs text-gray-500">Keep it short and specific — guests scan titles fast.</p>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Property type</p>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map((type) => (
              <ToggleChip
                key={type.value}
                active={form.property_type === type.value}
                onClick={() => setForm((prev) => ({ ...prev, property_type: type.value }))}
              >
                {type.label}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <span className={`text-xs ${descLen > DESC_SOFT_MAX ? 'text-amber-600' : 'text-gray-400'}`}>
              {descLen}/{DESC_SOFT_MAX}
            </span>
          </div>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className={inputClasses}
            placeholder="What makes this stay special? Neighborhood, light, quiet, views…"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lead with the vibe, then practical details. Aim for a few clear paragraphs.
          </p>
        </div>
      </div>
      <SaveButton onClick={handleSave} saving={saving} disabled={!form.title.trim()} sticky />
    </SectionCard>
  );
};

export default BasicInfoSection;
