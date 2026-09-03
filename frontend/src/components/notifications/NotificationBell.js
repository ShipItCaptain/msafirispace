import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const POLL_INTERVAL_MS = 30000;

const timeAgo = (isoString) => {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
};

const NotificationBell = ({ isScrolled }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await notificationsAPI.getNotifications({ is_read: false, page_size: 1 });
      setUnreadCount(data?.count ?? 0);
    } catch (_) {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const openDropdown = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await notificationsAPI.getNotifications({ page_size: 10 });
        setNotifications(data?.results || (Array.isArray(data) ? data : []));
      } catch (_) {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      notificationsAPI.markAsRead(notification.id).catch(() => {});
    }
    setIsOpen(false);
    const bookingId = notification.data?.booking_id;
    if (!bookingId) return;

    // /booking/:id is guest-only (the booking is scoped to its traveler
    // server-side); a host clicking through would just hit a 404. Route
    // hosts to their own bookings tab instead, where the same booking (and
    // its message thread) is reachable via "View".
    const isHostViewer = Boolean(user?.roles?.includes('bnb_host') || user?.roles?.includes('hotel_host'));
    if (isHostViewer) {
      const destination = notification.data?.hotel_id ? '/host/hotels' : '/host/bnb';
      navigate(destination, { state: { initialTab: 'bookings' } });
    } else {
      navigate(`/booking/${bookingId}`);
    }
  };

  const handleMarkAllRead = async (event) => {
    event.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await notificationsAPI.markAllAsRead();
    } catch (_) {
      // best-effort; unread state will re-sync on next poll
    }
  };

  return (
    <div className="relative notification-bell-container" ref={containerRef}>
      <button
        type="button"
        onClick={openDropdown}
        aria-label="Notifications"
        className={`relative p-2 rounded-lg transition-colors duration-200 ${
          isScrolled ? 'text-secondary-600 hover:bg-secondary-100' : 'text-white hover:bg-white/10'
        }`}
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] max-h-[26rem] overflow-y-auto bg-white rounded-lg shadow-large border border-secondary-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100">
            <span className="text-sm font-semibold text-secondary-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-secondary-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-secondary-500">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-secondary-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 hover:bg-secondary-50 transition-colors duration-150 ${
                    notification.is_read ? '' : 'bg-primary-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                    <div className={notification.is_read ? 'pl-4' : ''}>
                      <p className="text-sm font-semibold text-secondary-900">{notification.title}</p>
                      {notification.message && (
                        <p className="text-xs text-secondary-600 mt-0.5 line-clamp-2">{notification.message}</p>
                      )}
                      <p className="text-[11px] text-secondary-400 mt-1">{timeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
