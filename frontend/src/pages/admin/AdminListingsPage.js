import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Unverified' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
];

const PAGE_SIZE = 20;

const AdminListingsPage = () => {
  const [listingType, setListingType] = useState('hotels'); // 'hotels' | 'bnbs'
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [actingOnId, setActingOnId] = useState(null);

  const api = listingType === 'hotels'
    ? { getList: adminAPI.getHotels, moderate: adminAPI.moderateHotel }
    : { getList: adminAPI.getBnBs, moderate: adminAPI.moderateBnB };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ordering: sort };
      if (search) params.search = search;
      if (verifiedFilter) params.is_verified = verifiedFilter;
      const data = await api.getList(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load listings.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, page, sort, search, verifiedFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [listingType, search, verifiedFilter, sort]);

  const toggleField = async (row, field) => {
    setActingOnId(row.id);
    try {
      await api.moderate(row.id, field, !row[field]);
      load();
    } catch (err) {
      toast.error('Action failed.');
    } finally {
      setActingOnId(null);
    }
  };

  const nameKey = listingType === 'hotels' ? 'name' : 'title';

  const columns = [
    {
      key: 'name',
      label: 'Listing',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row[nameKey]}</p>
          <p className="text-xs text-gray-500">{row.city}, {row.country} · {row.host_email}</p>
        </div>
      ),
    },
    { key: 'verified', label: 'Verified', render: (row) => <StatusBadge status={row.is_verified ? 'verified' : 'unverified'} /> },
    { key: 'active', label: 'Active', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'cancelled'} label={row.is_active ? 'Active' : 'Inactive'} /> },
    { key: 'featured', label: 'Featured', render: (row) => (row.is_featured ? <StatusBadge status="active" label="Featured" /> : <span className="text-gray-400">—</span>) },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-1">
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleField(row, 'is_verified'); }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            {row.is_verified ? 'Unverify' : 'Verify'}
          </button>
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleField(row, 'is_featured'); }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            {row.is_featured ? 'Unfeature' : 'Feature'}
          </button>
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleField(row, 'is_active'); }}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Listings" description="Verify, feature, and moderate hotel and BnB listings." />

      <div className="inline-flex mb-4 border border-gray-200 bg-gray-50 p-0.5 rounded-full">
        {[{ id: 'hotels', label: 'Hotels' }, { id: 'bnbs', label: 'BnBs' }].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setListingType(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              listingType === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No listings found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${listingType} by name or city`}
        statusFilters={STATUS_FILTERS}
        activeStatus={verifiedFilter}
        onStatusChange={setVerifiedFilter}
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminListingsPage;
