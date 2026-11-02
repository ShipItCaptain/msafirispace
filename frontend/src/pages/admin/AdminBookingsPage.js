import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import AdminDataTable from '../../components/common/AdminDataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'check_in', label: 'Check-in date' },
  { value: '-total_amount', label: 'Amount: high to low' },
];

const PAGE_SIZE = 20;

const AdminBookingsPage = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, ordering: sort };
      if (search) params.search = search;
      if (status) params.status = status;
      const data = await adminAPI.getBookings(params);
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, sort]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await adminAPI.messageGuest(messageTarget.id, messageText.trim());
      toast.success(`Message sent to ${messageTarget.guest_email}.`);
      setMessageTarget(null);
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const columns = [
    {
      key: 'guest',
      label: 'Guest',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.guest_full_name}</p>
          <p className="text-xs text-gray-500">{row.guest_email}</p>
        </div>
      ),
    },
    {
      key: 'property',
      label: 'Property',
      render: (row) => (
        <div>
          <p className="text-gray-900">{row.property_name || '—'}</p>
          <p className="text-xs text-gray-500 capitalize">{row.property_type}</p>
        </div>
      ),
    },
    { key: 'dates', label: 'Dates', render: (row) => `${row.check_in} → ${row.check_out}` },
    { key: 'amount', label: 'Amount', render: (row) => `${row.currency} ${row.total_amount}` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'payment_status', label: 'Payment', render: (row) => <StatusBadge status={row.payment_status} /> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMessageTarget(row); }}
          className="whitespace-nowrap text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 -mx-2 rounded-md transition-colors"
        >
          Message guest
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Bookings" description="Track reservations and reach out to guests when needed." />
      <AdminDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No bookings found."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by guest name or email"
        statusFilters={STATUS_FILTERS}
        activeStatus={status}
        onStatusChange={setStatus}
        sortOptions={SORT_OPTIONS}
        activeSort={sort}
        onSortChange={setSort}
        pagination={{ count, page, pageSize: PAGE_SIZE, onPageChange: setPage }}
      />

      <Modal
        isOpen={Boolean(messageTarget)}
        onClose={() => { setMessageTarget(null); setMessageText(''); }}
        title={`Message ${messageTarget?.guest_full_name || 'guest'}`}
      >
        <p className="text-sm text-gray-600 mb-3">
          Sent as a direct email to {messageTarget?.guest_email} — not posted into the in-app conversation.
        </p>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
          placeholder="Type your message..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setMessageTarget(null); setMessageText(''); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !messageText.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBookingsPage;
