import React, { useState } from 'react';
import { getAmenityIcon } from '../../utils/amenityIcons';
import { categorizeAmenities } from '../../utils/amenityCategories';
import Modal from './Modal';

const AmenityRow = ({ amenity }) => {
  const Icon = getAmenityIcon(amenity);
  return (
    <div className="flex items-center gap-1.5 min-w-[130px]">
      <Icon size={17} stroke={1.75} className="text-red-600 flex-shrink-0" />
      <span className="text-sm text-gray-900">{amenity}</span>
    </div>
  );
};

/**
 * Shows the first `previewCount` amenities inline; "Show all" opens a
 * categorized modal (Bathroom / Bedroom / Kitchen & Dining / etc.) instead
 * of growing the inline list — progressive disclosure, not a longer page.
 */
const AmenityList = ({ amenities = [], previewCount = 10 }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (amenities.length === 0) return null;

  const preview = amenities.slice(0, previewCount);
  const hasMore = amenities.length > preview.length;
  const categorized = categorizeAmenities(amenities);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
        Amenities
      </h3>
      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {preview.map((amenity) => (
          <AmenityRow key={amenity} amenity={amenity} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-4 rounded-lg border border-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Show all {amenities.length} amenities
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`All amenities (${amenities.length})`}
      >
        <div className="space-y-6">
          {categorized.map(({ category, items }) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                {category}
              </h4>
              <div className="space-y-2.5">
                {items.map((amenity) => (
                  <AmenityRow key={amenity} amenity={amenity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default AmenityList;
