import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Visible' },
  { value: 'false', label: 'Hidden' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'rating', label: 'Lowest rating' },
  { value: '-rating', label: 'Highest rating' },
];

const PAGE_SIZE = 20;

const AdminReviewsPage = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [actingOnId, setActingOnId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ordering: sort };
      if (search) params.search = search;
      if (visibility) params.is_public = visibility;
      const data = await adminAPI.getReviews(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, visibility]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, visibility, sort]);

  const toggleVisibility = async (row) => {
    setActingOnId(row.id);
    try {
      await adminAPI.setReviewVisibility(row.id, !row.is_public);
      load();
    } catch (err) {
      toast.error('Action failed.');
    } finally {
      setActingOnId(null);
    }
  };

  const columns = [
    {
      key: 'review',
      label: 'Review',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-medium text-gray-900">{row.title || `${row.rating}★`}</p>
          <p className="text-xs text-gray-500 truncate">{row.comment}</p>
        </div>
      ),
    },
    { key: 'traveler', label: 'Traveler', render: (row) => row.traveler_email },
    { key: 'property', label: 'Property', render: (row) => row.property_name || '—' },
    { key: 'rating', label: 'Rating', render: (row) => `${row.rating}★` },
    { key: 'visibility', label: 'Visibility', render: (row) => <StatusBadge status={row.is_public ? 'active' : 'cancelled'} label={row.is_public ? 'Visible' : 'Hidden'} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          type="button"
          disabled={actingOnId === row.id}
          onClick={(e) => { e.stopPropagation(); toggleVisibility(row); }}
          className={`text-xs font-medium px-2 py-1 -mx-2 rounded-md transition-colors disabled:opacity-50 ${
            row.is_public ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          {row.is_public ? 'Hide' : 'Unhide'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate guest reviews visible on listings." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No reviews found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by comment or traveler email"
        statusFilters={STATUS_FILTERS}
        activeStatus={visibility}
        onStatusChange={setVisibility}
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminReviewsPage;
