import React from 'react';

/**
 * Unboxed label/value atom — no border, no background. Used for compact
 * facts like "Check-in: 15:00" without wrapping every stat in its own
 * bordered panel (the boxed-per-fact pattern this replaces).
 */
const InfoCard = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);

export default InfoCard;
