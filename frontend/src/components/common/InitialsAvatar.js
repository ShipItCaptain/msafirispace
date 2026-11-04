import React from 'react';

// Same soft-tone family as StatusBadge, so avatars read as part of the same
// system rather than introducing a second, louder palette.
const TONES = [
  'bg-indigo-50 text-indigo-700',
  'bg-blue-50 text-blue-700',
  'bg-green-50 text-green-700',
  'bg-amber-50 text-amber-700',
  'bg-red-50 text-red-700',
  'bg-slate-100 text-slate-600',
  'bg-purple-50 text-purple-700',
  'bg-pink-50 text-pink-700',
];

const getInitials = (name = '') => {
  const letters = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .replace(/[^a-zA-Z]/g, '');
  return (letters.slice(0, 2) || '?').toUpperCase();
};

// Deterministic hash -> same name always gets the same tone, across pages
// and reloads, without storing anything.
const toneForString = (text = '') => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return TONES[Math.abs(hash) % TONES.length];
};

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-8 h-8 text-xs',
};

const InitialsAvatar = ({ name, size = 'sm' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full font-medium shrink-0 ${SIZE_CLASSES[size]} ${toneForString(name)}`}
  >
    {getInitials(name)}
  </span>
);

export default InitialsAvatar;
