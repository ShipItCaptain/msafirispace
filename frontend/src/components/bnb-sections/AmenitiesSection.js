import React, { useState } from 'react';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { amenityCategories } from '../../utils/bnbOptions';
import { SectionCard, SaveButton, ToggleChip, extractErrorMessage } from './shared';

const AmenitiesSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [selected, setSelected] = useState(listing.amenities || []);
  const [saving, setSaving] = useState(false);

  const toggle = (amenity) => {
    setSelected((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await bnbAPI.update(listing.id, { amenities: selected });
      onUpdated(updated);
      showSuccess('Saved', 'Amenities updated.', 4000);
    } catch (error) {
      showError('Save Failed', extractErrorMessage(error), 6000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Amenities"
      description={`${selected.length} selected · tap to add what guests will find.`}
    >
      {Object.entries(amenityCategories).map(([category, amenities]) => (
        <div key={category} className="mb-6 last:mb-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <ToggleChip
                key={amenity}
                active={selected.includes(amenity)}
                onClick={() => toggle(amenity)}
              >
                {amenity}
              </ToggleChip>
            ))}
          </div>
        </div>
      ))}
      <SaveButton onClick={handleSave} saving={saving} sticky />
    </SectionCard>
  );
};

export default AmenitiesSection;
