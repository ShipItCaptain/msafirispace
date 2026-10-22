// BnB listing amenities come from the API as plain strings with no backend
// category field (unlike Hotel's relational amenity mappings, which do
// carry a category). This is a client-side heuristic grouping for the
// "show all amenities" modal — inference from the name, not real taxonomy.
const CATEGORY_RULES = [
  ['Bathroom', /shower|bathtub|hair dryer|toiletries|towel/i],
  ['Bedroom', /bed linen|wardrobe|iron|hanger|blackout/i],
  ['Kitchen & Dining', /kitchen|fridge|microwave|stove|oven|dishwasher|coffee|kettle|dining|cutlery/i],
  ['Entertainment', /\btv\b|television|wi-?fi|internet|netflix|sound system|speaker/i],
  ['Safety', /smoke alarm|fire extinguisher|first aid|carbon monoxide|security camera|lock/i],
  ['Outdoor & Parking', /parking|balcony|garden|pool|bbq|barbecue|patio|terrace/i],
];

export const categorizeAmenities = (amenities = []) => {
  const buckets = new Map();
  for (const amenity of amenities) {
    const match = CATEGORY_RULES.find(([, pattern]) => pattern.test(amenity));
    const category = match ? match[0] : 'General';
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push(amenity);
  }
  // Keep category-rule order, "General" always last regardless of when it first appeared.
  const orderedNames = [...CATEGORY_RULES.map(([name]) => name), 'General'];
  return orderedNames
    .filter((name) => buckets.has(name))
    .map((name) => ({ category: name, items: buckets.get(name) }));
};
