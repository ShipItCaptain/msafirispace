import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Notification = ({ 
  id, 
  type = 'success', 
  title, 
  message, 
  duration = 5000, 
  onClose 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-green-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-full rounded-lg border shadow-lg ${getBackgroundColor()}`}
      role="status"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 pt-0.5">{getIcon()}</div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className={`text-sm font-semibold leading-5 ${getTextColor()}`}>
              {title}
            </p>
          )}
          {message && (
            <p className={`mt-0.5 text-sm leading-5 ${getTextColor()} opacity-90`}>
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(id)}
          className={`flex-shrink-0 rounded-md p-0.5 ${getTextColor()} opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500`}
        >
          <span className="sr-only">Close</span>
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
};

export default Notification;
