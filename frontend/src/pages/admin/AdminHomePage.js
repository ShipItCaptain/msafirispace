import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import InitialsAvatar from '../../components/common/InitialsAvatar';
import OverviewStats from '../../components/common/OverviewStats';

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
};

const TYPE_ICON = { booking: CalendarDaysIcon, hotel: BuildingOfficeIcon, bnb: HomeModernIcon };

// Three tiers instead of a flat "urgent/not" -- something waiting a year
// (a stale unverified listing) and something expiring in 4 hours (a hold)
// both need to visually outrank ordinary rows, but at different intensity.
const URGENCY_CLASSES = {
  critical: { border: 'border-red-400', bg: 'bg-red-50/40', text: 'text-red-700' },
  warning: { border: 'border-amber-400', bg: 'bg-amber-50/30', text: 'text-amber-700' },
  normal: { border: 'border-transparent', bg: '', text: 'text-gray-400' },
};

const QueueRow = ({ item, onQuickVerify, verifying }) => {
  const Icon = TYPE_ICON[item.type] || CalendarDaysIcon;
  const isVerifying = verifying === `${item.type}-${item.id}`;
  const tone = URGENCY_CLASSES[item.urgency] || URGENCY_CLASSES.normal;

  return (
    <div
      className={`group flex items-center gap-4 pl-4 pr-2 py-3.5 border-l-2 transition-colors hover:bg-gray-50/60 ${tone.border} ${tone.bg}`}
    >
      {item.type === 'booking' ? (
        <InitialsAvatar name={item.guest_name} />
      ) : (
        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">{item.title}</p>
        <p className={`text-xs truncate ${tone.text}`}>{item.subtitle}</p>
      </div>
      <span className="text-xs text-gray-400 shrink-0 tabular-nums">{timeAgo(item.waiting_since)}</span>
      <div className="w-16 shrink-0 text-right">
        {item.quick_action ? (
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => onQuickVerify(item)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 transition-opacity"
          >
            Verify
          </button>
        ) : (
          <Link
            to={item.action_to}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
};

// Plain numbers with hairline dividers, not cards -- gives an at-a-glance
// read before the list without reintroducing the stat-card grid this admin
// explicitly moved away from.
const SummaryStrip = ({ counts }) => (
  <div className="flex items-center gap-6 pb-5 mb-1 border-b border-gray-100">
    <div>
      <span className="text-2xl font-semibold text-gray-900 tabular-nums">{counts.bookings}</span>
      <span className="ml-1.5 text-sm text-gray-500">pending bookings</span>
    </div>
    <div className="w-px h-8 bg-gray-200" />
    <div>
      <span className="text-2xl font-semibold text-gray-900 tabular-nums">{counts.listings}</span>
      <span className="ml-1.5 text-sm text-gray-500">unverified listings</span>
    </div>
    <div className="w-px h-8 bg-gray-200" />
    <div>
      <span className={`text-2xl font-semibold tabular-nums ${counts.critical > 0 ? 'text-red-600' : 'text-gray-900'}`}>
        {counts.critical}
      </span>
      <span className="ml-1.5 text-sm text-gray-500">critical</span>
    </div>
  </div>
);

const AdminHomePage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ bookings: 0, listings: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    adminAPI.getNeedsAttention()
      .then((data) => {
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
        setCounts(data.counts || { bookings: 0, listings: 0, critical: 0 });
      })
      .catch(() => toast.error('Failed to load queue.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminAPI.getOverviewStats()
      .then(setStats)
      .catch(() => toast.error('Failed to load overview stats.'));
  }, []);

  const quickVerify = async (item) => {
    setVerifying(`${item.type}-${item.id}`);
    try {
      if (item.type === 'hotel') await adminAPI.moderateHotel(item.id, 'is_verified', true);
      else await adminAPI.moderateBnB(item.id, 'is_verified', true);
      toast.success(`${item.title} verified.`);
      load();
    } catch (err) {
      toast.error('Failed to verify.');
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div>
      <PageHeader title="Overview" description={`Signed in as ${user?.email} · ${user?.admin_tier} tier`} />

      <OverviewStats stats={stats} />

      {!loading && <SummaryStrip counts={counts} />}

      {loading ? (
        <div className="border-t border-gray-100 max-w-3xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 pl-4 pr-2 py-3.5 border-b border-gray-50">
              <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0" />
              <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: `${45 + (i * 11) % 35}%` }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-3xl border-t border-gray-100 py-16 flex flex-col items-center text-center">
          <CheckCircleIcon className="w-7 h-7 text-green-500 mb-2" />
          <p className="text-sm text-gray-500">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {items.map((item) => (
              <QueueRow key={`${item.type}-${item.id}`} item={item} onQuickVerify={quickVerify} verifying={verifying} />
            ))}
          </div>
          {totalCount > items.length && (
            <p className="mt-3 text-xs text-gray-400">Showing {items.length} of {totalCount} — oldest and most urgent first.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHomePage;
