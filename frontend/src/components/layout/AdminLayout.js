import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon,
  UsersIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  MegaphoneIcon,
  StarIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

// Single source of truth for both "what's in the sidebar" and "which tiers
// see it" -- filtered per-render, so a tier below a page's requirement
// never sees the nav item at all (hide, don't disable). Grouped into
// "Operations" (what every tier touches day to day) and "System" (System
// tier only) so the sidebar reads as two distinct concerns, not one flat list.
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin', label: 'Overview', icon: Squares2X2Icon, tiers: ['system', 'managerial', 'support'], end: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/users', label: 'Users', icon: UsersIcon, tiers: ['system', 'managerial', 'support'] },
      { to: '/admin/bookings', label: 'Bookings', icon: CalendarDaysIcon, tiers: ['system', 'managerial', 'support'] },
      { to: '/admin/payments', label: 'Payments', icon: CreditCardIcon, tiers: ['system', 'managerial'] },
      { to: '/admin/listings', label: 'Listings', icon: BuildingOfficeIcon, tiers: ['system', 'managerial'] },
      { to: '/admin/promotions', label: 'Promotions', icon: MegaphoneIcon, tiers: ['system', 'managerial'] },
      { to: '/admin/reviews', label: 'Reviews', icon: StarIcon, tiers: ['system', 'managerial'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/manage-admins', label: 'Admins', icon: ShieldCheckIcon, tiers: ['system'] },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardDocumentListIcon, tiers: ['system'] },
    ],
  },
];

const TIER_LABELS = { system: 'System', managerial: 'Managerial', support: 'Support' };

const initials = (user) => {
  const a = (user?.first_name || user?.email || '?').trim()[0] || '?';
  const b = (user?.last_name || '').trim()[0] || '';
  return (a + b).toUpperCase();
};

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex">
      <aside className="w-64 shrink-0 bg-gray-950 flex flex-col">
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Msafiri Space</p>
            <p className="text-[11px] text-gray-500 leading-none">Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group, idx) => {
            const visibleItems = group.items.filter((item) => item.tiers.includes(user?.admin_tier));
            if (visibleItems.length === 0) return null;
            return (
              <div key={idx}>
                {group.label && (
                  <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-indigo-500/15 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center justify-end px-8 border-b border-gray-200/70 bg-white/70 backdrop-blur-sm relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 py-1.5 pl-1.5 pr-2.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(user)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.first_name || user?.email}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{TIER_LABELS[user?.admin_tier] || user?.admin_tier}</p>
            </div>
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-8 top-14 z-20 w-48 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-900/5 py-1.5">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 text-gray-400" />
                  Log out
                </button>
              </div>
            </>
          )}
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
