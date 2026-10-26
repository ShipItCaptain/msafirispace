import React, { useEffect } from 'react';
import { FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const DiscoveryStickyBar = ({
  where,
  onWhereChange,
  wherePlaceholder = 'Search destinations',
  children,
  filterCount = 0,
  onOpenFilters,
  onClear,
  showClear = false,
}) => (
  <div className="sticky top-14 lg:top-20 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 lg:py-3">
      <div className="flex items-center gap-2 lg:gap-0 lg:divide-x lg:divide-gray-200 border border-gray-300 bg-white rounded-full lg:rounded-none">
        <label className="flex-1 min-w-0 flex items-center gap-2 px-3.5 py-2 lg:py-2.5">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <span className="hidden lg:block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Where</span>
            <input
              type="search"
              value={where}
              onChange={(event) => onWhereChange(event.target.value)}
              placeholder={wherePlaceholder}
              aria-label="Where"
              className="w-full text-sm text-gray-900 placeholder:text-gray-400 border-0 p-0 focus:ring-0 bg-transparent"
            />
          </div>
        </label>

        {/* Secondary fields (city/dates/guests): inline on desktop, tucked into the Filters sheet on mobile to keep the bar thin */}
        <div className="hidden lg:contents">{children}</div>

        <div className="flex items-center gap-1.5 lg:gap-2 pr-1.5 lg:pr-3 lg:px-3 lg:py-0">
          <button
            type="button"
            onClick={onOpenFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 lg:py-2 text-sm font-medium border rounded-full lg:rounded-none ${
              filterCount > 0
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={`Filters${filterCount ? `, ${filterCount} active` : ''}`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {filterCount > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const DiscoveryBarField = ({ label, className = '', children }) => (
  <label className={`flex-1 min-w-0 flex flex-col justify-center px-3 py-2.5 ${className}`}>
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    {children}
  </label>
);

export const fieldInputClass =
  'w-full text-sm text-gray-900 placeholder:text-gray-400 border-0 p-0 focus:ring-0 bg-transparent';

export const FiltersSheet = ({ open, onClose, title = 'Filters', activeCount = 0, onClear, children }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close filters"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="discovery-filters-title"
        className="relative w-full max-w-md h-full bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div>
            <h2 id="discovery-filters-title" className="text-lg font-bold text-gray-900">
              {title}
            </h2>
            {activeCount > 0 && (
              <p className="text-xs text-gray-500">{activeCount} active</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700"
            aria-label="Close filters"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">{children}</div>
        <div className="border-t border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
          >
            Show results
          </button>
        </div>
      </aside>
    </div>
  );
};

export const DiscoveryResultsHeader = ({ countLabel, placeLabel, sortBy, onSortChange, sortOptions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
    <div>
      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">{countLabel}</h1>
      {placeLabel && <p className="text-sm text-gray-500 mt-0.5">{placeLabel}</p>}
    </div>
    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">Sort</span>
      <select
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value)}
        className="border border-gray-300 text-sm px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
        aria-label="Sort results"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  </div>
);

export const DiscoveryEmptyState = ({ title, message, onClear, clearLabel = 'Clear filters' }) => (
  <div className="border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
    <p className="text-base font-medium text-gray-900">{title}</p>
    <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{message}</p>
    {onClear && (
      <button
        type="button"
        onClick={onClear}
        className="mt-5 text-sm font-semibold text-red-600 hover:text-red-700"
      >
        {clearLabel}
      </button>
    )}
  </div>
);
