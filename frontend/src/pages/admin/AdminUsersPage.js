import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Suspended' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'email', label: 'Email A-Z' },
];

const PAGE_SIZE = 20;

const AdminUsersPage = () => {
  const { user, isSupportAdmin } = useAuth();
  const currentUserId = user?.id;
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
      if (status) params.is_active = status;
      const data = await adminAPI.getUsers(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, status]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever the filters themselves change, not on every page click.
  useEffect(() => { setPage(1); }, [search, status, sort]);

  const toggleActive = async (user) => {
    setActingOnId(user.id);
    try {
      if (user.is_active) {
        await adminAPI.suspendUser(user.id);
        toast.success(`${user.email} suspended.`);
      } else {
        await adminAPI.activateUser(user.id);
        toast.success(`${user.email} reactivated.`);
      }
      load();
    } catch (err) {
      toast.error('Action failed.');
    } finally {
      setActingOnId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'user_type', label: 'Type', render: (row) => <span className="capitalize">{row.user_type}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'cancelled'} label={row.is_active ? 'Active' : 'Suspended'} /> },
    { key: 'created_at', label: 'Joined', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  if (!isSupportAdmin) {
    columns.push({
      key: 'actions',
      label: '',
      render: (row) => (
        row.id === currentUserId ? null : (
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); toggleActive(row); }}
            className={`text-xs font-medium px-2 py-1 -mx-2 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent ${
              row.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-700 hover:text-green-800 hover:bg-green-50'
            }`}
          >
            {row.is_active ? 'Suspend' : 'Reactivate'}
          </button>
        )
      ),
    });
  }

  return (
    <div>
      <PageHeader title="Users" description="Search, verify, and manage platform accounts." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No users found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, or phone"
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

export default AdminUsersPage;
