import React from 'react';

// Status -> tone map. Grows with real usage per admin module rather than
// enumerating every status across every domain up front.
const STATUS_TONES = {
  // Bookings
  pending: 'amber',
  confirmed: 'green',
  cancelled: 'red',
  completed: 'slate',
  // Payments
  paid: 'green',
  unpaid: 'amber',
  partially_paid: 'amber',
  pending_payment: 'amber',
  refunded: 'slate',
  success: 'green',
  failed: 'red',
  // Host approval
  approved: 'green',
  declined: 'red',
  // Listings / promotions
  active: 'green',
  draft: 'slate',
  paused: 'amber',
  expired: 'slate',
  verified: 'green',
  unverified: 'amber',
  // Admin tiers
  system: 'indigo',
  managerial: 'blue',
  support: 'slate',
  // Composite booking lifecycle (see AdminBookingsPage) -- paid but stuck
  // in manual review needs to visually stand apart from ordinary pending.
  needs_review: 'purple',
};

const TONE_CLASSES = {
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

const DOT_CLASSES = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const StatusBadge = ({ status, label }) => {
  const key = String(status ?? '').toLowerCase();
  const tone = STATUS_TONES[key] || 'slate';
  const text = label || key.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      {text || '—'}
    </span>
  );
};

export default StatusBadge;
