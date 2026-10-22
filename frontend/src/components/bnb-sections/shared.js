import React from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export const inputClasses =
  'w-full px-4 py-3 border border-gray-300 rounded-none text-base focus:ring-2 focus:ring-red-500 focus:border-transparent';

export const SectionCard = ({ title, description, children, flush = false }) => (
  <section className={`bg-white border border-gray-200 ${flush ? '' : 'p-6'}`}>
    {(title || description) && (
      <div className={flush ? 'px-6 pt-6' : ''}>
        {title && <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>}
        {description && <p className="text-sm text-gray-500 mb-5">{description}</p>}
      </div>
    )}
    {flush ? <div className="px-6 pb-6">{children}</div> : children}
  </section>
);

export const SaveButton = ({ onClick, saving, label = 'Save', disabled = false, sticky = false }) => (
  <div
    className={
      sticky
        ? 'sticky bottom-0 -mx-6 mt-6 px-6 py-3 bg-white/95 border-t border-gray-200 backdrop-blur-sm'
        : 'mt-5'
    }
  >
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="px-5 py-2.5 bg-red-600 text-white rounded-none text-sm font-medium hover:bg-red-700 disabled:opacity-60"
    >
      {saving ? 'Saving…' : label}
    </button>
  </div>
);

export const Stepper = ({ label, value, onChange, min = 0, max = 99, step = 1 }) => {
  const numeric = Number(value) || 0;
  const dec = () => onChange(Math.max(min, Number((numeric - step).toFixed(2))));
  const inc = () => onChange(Math.min(max, Number((numeric + step).toFixed(2))));
  const display = Number.isInteger(step) ? numeric : Number(numeric.toFixed(1));
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={numeric <= min}
          className="w-8 h-8 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          <MinusIcon className="w-4 h-4 mx-auto" />
        </button>
        <span className="w-10 text-center text-sm font-semibold text-gray-900 tabular-nums">{display}</span>
        <button
          type="button"
          onClick={inc}
          disabled={numeric >= max}
          className="w-8 h-8 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          <PlusIcon className="w-4 h-4 mx-auto" />
        </button>
      </div>
    </div>
  );
};

export const ToggleChip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3 py-2 text-sm border text-left transition-colors ${
      active
        ? 'border-red-600 bg-red-50 text-red-700 font-medium'
        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
    }`}
  >
    {children}
  </button>
);

export const extractErrorMessage = (error) => {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length > 0) {
    return `${firstKey}: ${data[firstKey][0]}`;
  }
  if (firstKey && typeof data[firstKey] === 'string') {
    return `${firstKey}: ${data[firstKey]}`;
  }
  return error?.message || 'Something went wrong. Please try again.';
};
