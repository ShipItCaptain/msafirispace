import React from 'react';
import { AnimatePresence } from 'framer-motion';
import Notification from './Notification';

const NotificationContainer = ({ notifications, onClose }) => {
  // Sit below the fixed header (z-50) so toasts aren't clipped behind it.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
      <AnimatePresence>
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto w-full max-w-sm">
            <Notification
              {...notification}
              onClose={onClose}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;
