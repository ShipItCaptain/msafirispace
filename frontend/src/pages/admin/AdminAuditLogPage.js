import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import PageHeader from '../../components/common/PageHeader';

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
];

const PAGE_SIZE = 20;

const AdminAuditLogPage = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ordering: sort };
      if (search) params.search = search;
      const data = await adminAPI.getAuditLog(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, sort]);

  const columns = [
    { key: 'created_at', label: 'When', render: (row) => new Date(row.created_at).toLocaleString() },
    { key: 'actor', label: 'Actor', render: (row) => (
      <div>
        <p className="text-gray-900">{row.actor_email || 'deleted account'}</p>
        <p className="text-xs text-gray-500 capitalize">{row.actor_tier}</p>
      </div>
    ) },
    { key: 'action', label: 'Action', render: (row) => (
      <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 font-mono text-[11px] text-gray-700">{row.action}</span>
    ) },
    { key: 'target', label: 'Target', render: (row) => (
      <span className="font-mono text-xs text-gray-500">{row.target_model}#{row.target_id}</span>
    ) },
    { key: 'note', label: 'Note', render: (row) => <span className="text-gray-600">{row.note || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Log" description="Every action taken through the admin dashboard, in order." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No admin actions logged yet."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by target ID, note, or actor email"
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminAuditLogPage;
