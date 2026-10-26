import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  HomeModernIcon as HomeModernIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useAuth } from '../../hooks/useAuth';

const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const hasBnBRole = Boolean(user?.roles?.includes('bnb_host'));
  const hasHotelRole = Boolean(user?.roles?.includes('hotel_host'));
  const hasHostRoles = hasBnBRole || hasHotelRole;
  const profileHref = !isAuthenticated
    ? '/login'
    : hasBnBRole && hasHotelRole
      ? '/host/home'
      : hasHotelRole
        ? '/host-dashboard'
        : hasBnBRole
          ? '/host/bnb'
          : '/dashboard';

  const items = [
    { name: 'Explore', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid, match: (p) => p === '/' },
    { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon, activeIcon: BuildingOfficeIconSolid, match: (p) => p.startsWith('/hotels') },
    { name: 'BnBs', href: '/bnbs', icon: HomeModernIcon, activeIcon: HomeModernIconSolid, match: (p) => p.startsWith('/bnbs') },
    { name: hasHostRoles ? 'Dashboard' : 'Profile', href: profileHref, icon: UserIcon, activeIcon: UserIconSolid, match: (p) => p === profileHref || p === '/profile' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = item.match(location.pathname);
          const Icon = active ? item.activeIcon : item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium"
            >
              <Icon className={`w-6 h-6 ${active ? 'text-red-600' : 'text-gray-400'}`} />
              <span className={active ? 'text-red-600' : 'text-gray-500'}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
