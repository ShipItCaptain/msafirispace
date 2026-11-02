import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

const TIERS = [
  { value: 'system', label: 'System' },
  { value: 'managerial', label: 'Managerial' },
  { value: 'support', label: 'Support' },
];

const PAGE_SIZE = 20;

const AdminManageAdminsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actingOnId, setActingOnId] = useState(null);

  const [grantEmail, setGrantEmail] = useState('');
  const [grantTier, setGrantTier] = useState('support');
  const [granting, setGranting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAdmins({ page });
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load admins.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGranting(true);
    try {
      await adminAPI.grantAdmin(grantEmail.trim(), grantTier);
      toast.success(`${grantEmail.trim()} granted ${grantTier} tier.`);
      setGrantEmail('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to grant admin access.');
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (row) => {
    setActingOnId(row.id);
    try {
      await adminAPI.revokeAdmin(row.id);
      toast.success(`Revoked admin access for ${row.email}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to revoke access.');
    } finally {
      setActingOnId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Admin',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'tier', label: 'Tier', render: (row) => <StatusBadge status={row.admin_tier} label={row.admin_tier} /> },
    { key: 'granted', label: 'Granted', render: (row) => new Date(row.created_at).toLocaleDateString() },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        row.id === user?.id ? null : (
          <button
            type="button"
            disabled={actingOnId === row.id}
            onClick={(e) => { e.stopPropagation(); revoke(row); }}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 -mx-2 rounded-md transition-colors disabled:opacity-50"
          >
            Revoke
          </button>
        )
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Admins" description="Grant or revoke access to the super admin dashboard." />

      <form onSubmit={handleGrant} className="mb-6 flex items-end gap-3 bg-white border border-gray-200/80 rounded-2xl shadow-sm shadow-gray-200/40 p-5 max-w-xl">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Grant admin access by email</label>
          <input
            type="email"
            required
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="existing-user@example.com"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
          />
          <p className="mt-1.5 text-xs text-gray-400">The person must already have a Msafiri Space account.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tier</label>
          <select
            value={grantTier}
            onChange={(e) => setGrantTier(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
          >
            {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={granting}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {granting ? 'Granting...' : 'Grant'}
        </button>
      </form>

      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No admins found."
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminManageAdminsPage;
