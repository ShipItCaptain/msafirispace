// Shared option lists for BnB listing forms/sections -- single source so the
// quick-create form and the dashboard sections never drift apart.

export const propertyTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'condo', label: 'Condo' },
  { value: 'studio', label: 'Studio' },
  { value: 'loft', label: 'Loft' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'other', label: 'Other' },
];

export const amenityCategories = {
  Essentials: [
    'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
    'Dedicated workspace', 'TV', 'Hair dryer', 'Iron',
  ],
  Features: [
    'Pool', 'Hot tub', 'Free parking', 'EV charger', 'Gym', 'BBQ grill',
    'Fireplace', 'Balcony', 'Patio', 'Garden',
  ],
  Safety: [
    'Smoke alarm', 'Carbon monoxide alarm', 'Fire extinguisher',
    'First aid kit', 'CCTV', 'Security cameras', 'Safe',
  ],
  Accessibility: [
    'Step-free access', 'Wide doorway', 'Wide clearance to bed',
    'Accessible parking', 'Grab rails in bathroom',
  ],
};

export const houseRulesOptions = [
  'No smoking',
  'No parties or events',
  'No pets',
  'No loud music after 10 PM',
  'No shoes inside',
  'Respect neighbors',
  'Keep noise levels down',
  'Clean up after yourself',
  'No unregistered guests',
  'Check-in after 3 PM only',
];

// A listing is only worth showing to guests once it has a city, a real price,
// and at least one photo -- everything else on BnBListing already defaults sanely.
// is_active doubles as both "never finished" and "host paused a live
// listing", so status is derived from both signals rather than is_active
// alone, otherwise those two very different states would look identical.
export const meetsPublishMinimum = (listing) => {
  if (!listing) return false;
  const hasCity = Boolean(listing.city?.trim());
  const hasPrice = Number(listing.price_per_night) > 0;
  const hasPhoto =
    Boolean(listing.primary_image) ||
    (Array.isArray(listing.images) && listing.images.length > 0);
  return hasCity && hasPrice && hasPhoto;
};

export const getBnBListingStatus = (listing) => {
  if (!listing) return 'draft';
  if (listing.is_active) return 'active';
  return meetsPublishMinimum(listing) ? 'paused' : 'draft';
};

export const BNB_STATUS_LABELS = {
  draft: 'Draft',
  paused: 'Paused',
  active: 'Active',
};

export const BNB_STATUS_STYLES = {
  draft: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
};
