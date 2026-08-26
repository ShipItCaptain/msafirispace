export const normalizeAmenityToken = (value) => (
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
);

export const resolveHotelAmenityName = (label) => {
  const normalized = normalizeAmenityToken(label);
  const aliasMap = {
    wifi: 'Free WiFi',
    'wi-fi': 'Free WiFi',
    pool: 'Swimming Pool',
    gym: 'Fitness Center',
    laundry: null,
    airportshuttle: 'Airport Shuttle',
    businesscenter: 'Business Center',
    meetingrooms: 'Meeting Rooms',
    roomservice: 'Room Service',
    parking: 'Parking',
    spa: 'Spa',
    restaurant: 'Restaurant',
    bar: 'Bar',
    petfriendly: null,
    smokingallowed: null,
  };
  if (aliasMap[normalized] === null) return null;
  return aliasMap[normalized] || label;
};

export const buildAmenityIndex = (amenities = []) => (
  new Map(amenities.map((amenity) => [normalizeAmenityToken(amenity?.name), amenity?.id]))
);
