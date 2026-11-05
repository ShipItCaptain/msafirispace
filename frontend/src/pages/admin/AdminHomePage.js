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

// Urgency now reads as a small accent (dot + tinted time), never a full-row
// wash -- with a backlog of same-age items (56 listings all waiting a year),
// painting every row the same red turns the whole list into a solid block
// instead of helping anyone spot what's actually different.
const URGENCY_TEXT = {
  critical: 'text-red-600 font-medium',
  warning: 'text-amber-600',
  normal: 'text-gray-400',
};

const QueueRow = ({ item, onQuickVerify, verifying }) => {
  const Icon = TYPE_ICON[item.type] || CalendarDaysIcon;
  const isVerifying = verifying === `${item.type}-${item.id}`;

  return (
    <div className="flex items-center gap-3 py-3">
      {item.type === 'booking' ? (
        <InitialsAvatar name={item.guest_name} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">{item.title}</p>
        <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {item.urgency === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
        <span className={`text-xs tabular-nums ${URGENCY_TEXT[item.urgency] || URGENCY_TEXT.normal}`}>
          {timeAgo(item.waiting_since)}
        </span>
      </div>
      <div className="w-14 shrink-0 text-right">
        {item.quick_action ? (
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => onQuickVerify(item)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            Verify
          </button>
        ) : (
          <Link to={item.action_to} className="text-xs font-medium text-gray-400 hover:text-gray-900">
            View
          </Link>
        )}
      </div>
    </div>
  );
};

// A queue is a digest, not a backlog dump -- cap each category to its
// most urgent handful inline and hand the rest off to the category's own
// (already paginated, filterable) page rather than scrolling 56 near-
// identical rows on the home screen.
const SECTION_CAP = 5;

const QueueSection = ({ title, icon: Icon, items, totalCount, viewAllTo, onQuickVerify, verifying, emptyLabel }) => (
  <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
        {totalCount > 0 && <span className="text-gray-400 font-normal">· {totalCount}</span>}
      </h3>
      {totalCount > SECTION_CAP && (
        <Link to={viewAllTo} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all →
        </Link>
      )}
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-gray-400 py-6 text-center border-t border-gray-100">{emptyLabel}</p>
    ) : (
      <div className="border-t border-gray-100 divide-y divide-gray-50">
        {items.slice(0, SECTION_CAP).map((item) => (
          <QueueRow key={`${item.type}-${item.id}`} item={item} onQuickVerify={onQuickVerify} verifying={verifying} />
        ))}
      </div>
    )}
  </div>
);

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
  const [counts, setCounts] = useState({ bookings: 0, listings: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    adminAPI.getNeedsAttention()
      .then((data) => {
        setItems(data.items || []);
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
        <div className="max-w-5xl flex flex-col sm:flex-row gap-10">
          <QueueSection
            title="Bookings"
            icon={CalendarDaysIcon}
            items={items.filter((item) => item.type === 'booking')}
            totalCount={counts.bookings}
            viewAllTo="/admin/bookings"
            onQuickVerify={quickVerify}
            verifying={verifying}
            emptyLabel="No bookings need a decision."
          />
          <QueueSection
            title="Listings"
            icon={BuildingOfficeIcon}
            items={items.filter((item) => item.type === 'hotel' || item.type === 'bnb')}
            totalCount={counts.listings}
            viewAllTo="/admin/listings"
            onQuickVerify={quickVerify}
            verifying={verifying}
            emptyLabel="No listings need verification."
          />
        </div>
      )}
    </div>
  );
};

export default AdminHomePage;
