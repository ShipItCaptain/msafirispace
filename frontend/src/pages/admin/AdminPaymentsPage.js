import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import InitialsAvatar from '../../components/common/InitialsAvatar';

const TABS = [
  { id: 'payments', label: 'Payments' },
  { id: 'intents', label: 'Intents' },
  { id: 'webhooks', label: 'Webhook Events' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
];

const PAGE_SIZE = 20;

const PAYMENT_COLUMNS = [
  { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference}</span> },
  {
    key: 'traveler',
    label: 'Traveler',
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <InitialsAvatar name={row.traveler_email} />
        <span>{row.traveler_email}</span>
      </div>
    ),
  },
  { key: 'amount', label: 'Amount', render: (row) => `${row.currency} ${row.amount}` },
  { key: 'gateway', label: 'Gateway', render: (row) => <span className="capitalize">{row.gateway}</span> },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
];

const INTENT_COLUMNS = [
  { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference}</span> },
  {
    key: 'traveler',
    label: 'Traveler',
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <InitialsAvatar name={row.traveler_email} />
        <span>{row.traveler_email}</span>
      </div>
    ),
  },
  { key: 'amount', label: 'Amount', render: (row) => `${row.currency} ${row.amount}` },
  { key: 'gateway', label: 'Gateway', render: (row) => <span className="capitalize">{row.gateway}</span> },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
];

const WEBHOOK_COLUMNS = [
  { key: 'provider', label: 'Provider', render: (row) => <span className="capitalize">{row.provider}</span> },
  { key: 'event_key', label: 'Event key', render: (row) => <span className="font-mono text-xs">{row.event_key}</span> },
  { key: 'processed', label: 'Processed', render: (row) => <StatusBadge status={row.processed ? 'success' : 'pending'} label={row.processed ? 'Processed' : 'Pending'} /> },
  { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleString() },
];

const AdminPaymentsPage = () => {
  const [tab, setTab] = useState('payments');
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
      const fetcher = tab === 'payments' ? adminAPI.getPayments
        : tab === 'intents' ? adminAPI.getPaymentIntents
        : adminAPI.getPaymentWebhookEvents;
      const data = await fetcher(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load payment data.');
    } finally {
      setLoading(false);
    }
  }, [tab, page, sort, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, search, sort]);

  const columns = tab === 'payments' ? PAYMENT_COLUMNS : tab === 'intents' ? INTENT_COLUMNS : WEBHOOK_COLUMNS;

  return (
    <div>
      <PageHeader title="Payments" description="View-only — no refund actions until a payment gateway is live in production." />

      <div className="inline-flex mb-4 border border-gray-200 bg-gray-50 p-0.5 rounded-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
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
        emptyMessage="No records found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reference or email"
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />
    </div>
  );
};

export default AdminPaymentsPage;
