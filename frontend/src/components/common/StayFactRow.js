import React from 'react';

/**
 * Plain icon + quantity + auto-pluralized label — no box, no background.
 * e.g. <StayFactRow icon={IconBed} quantity={2} label="bed" />  ->  "2 beds"
 */
const StayFactRow = ({ icon: Icon, quantity, label }) => (
  <div className="flex items-center gap-2">
    <Icon size={22} stroke={1.5} className="text-gray-700" />
    <span className="text-sm text-ink-primary">
      {quantity ?? '—'} {label}{quantity === 1 ? '' : 's'}
    </span>
  </div>
);

export default StayFactRow;
