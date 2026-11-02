import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: '-views_count', label: 'Most viewed' },
  { value: '-bookings_count', label: 'Most bookings' },
];

const NEXT_STATUS = { draft: 'active', active: 'paused', paused: 'active', expired: null };
const PAGE_SIZE = 20;

const AdminPromotionsPage = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [actingOnId, setActingOnId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ordering: sort };
      if (search) params.search = search;
      if (status) params.status = status;
      const data = await adminAPI.getPromotions(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load promotions.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, sort]);

  const toggleStatus = async (row) => {
    const next = NEXT_STATUS[row.status];
    if (!next) return;
    setActingOnId(row.id);
    try {
      await adminAPI.setPromotionStatus(row.id, next);
      load();
    } catch (err) {
      toast.error('Action failed.');
    } finally {
      setActingOnId(null);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Promotion',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          <p className="text-xs text-gray-500">{row.hotel_name} · {row.promotion_type.replace('_', ' ')}</p>
        </div>
      ),
    },
    { key: 'price', label: 'Price', render: (row) => `${row.currency} ${row.discounted_price} (${row.discount_percentage}% off)` },
    { key: 'performance', label: 'Performance', render: (row) => `${row.views_count} views · ${row.bookings_count} bookings` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        NEXT_STATUS[row.status] ? (
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 -mx-2 rounded-md transition-colors disabled:opacity-50 capitalize"
          >
            {NEXT_STATUS[row.status] === 'active' ? 'Activate' : 'Pause'}
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Promotions" description="Manage featured campaigns and their lifecycle." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No promotions found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or hotel"
        statusFilters={STATUS_FILTERS}
        activeStatus={status}
        onStatusChange={setStatus}
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminPromotionsPage;
