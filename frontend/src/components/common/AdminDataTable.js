import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { InboxIcon } from '@heroicons/react/24/outline';
import Pagination from './Pagination';

const SkeletonRows = ({ columns }) => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-gray-100 last:border-0">
        {columns.map((col) => (
          <td key={col.key} className="px-5 py-3.5">
            <div
              className="h-3.5 rounded bg-gray-100 animate-pulse"
              style={{ width: `${40 + ((i * 13 + col.key.length * 7) % 45)}%` }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/**
 * Controlled, presentational admin list table: search + status-pill filter
 * + sort + pagination slot. The parent owns all state (search/filter/sort/
 * page) and fetches data accordingly -- this component only renders what
 * it's given.
 *
 * columns: [{ key, label, render?(row), align?: 'left'|'right' }]
 * statusFilters: [{ value, label, count? }]
 * sortOptions: [{ value, label }]
 */
const AdminDataTable = ({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No results.',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusFilters,
  activeStatus,
  onStatusChange,
  sortOptions,
  activeSort,
  onSortChange,
  pagination,
  onRowClick,
  getRowKey = (row) => row.id,
}) => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm shadow-gray-200/40 overflow-hidden">
      {(onSearchChange || sortOptions) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
          {onSearchChange && (
            <label className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0"
              />
            </label>
          )}

          {sortOptions && (
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50/60 text-sm text-gray-700 pl-3 pr-8 py-2 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {statusFilters && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-gray-100">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeStatus === filter.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter.label}
              {typeof filter.count === 'number' && (
                <span className={`ml-1.5 ${activeStatus === filter.value ? 'text-gray-300' : 'text-gray-400'}`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`font-medium text-gray-400 text-xs uppercase tracking-wide px-5 py-3 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows columns={columns} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <InboxIcon className="w-8 h-8 text-gray-300" />
                    <p className="text-sm text-gray-500">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-gray-50 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50/80' : 'hover:bg-gray-50/50'} transition-colors`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-gray-900 align-middle ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-5 border-t border-gray-100">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
};

export default AdminDataTable;
