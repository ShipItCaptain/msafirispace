import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  HomeModernIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const HostModeIndicator = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  const isHostMode = user.active_role && user.active_role !== 'guest';
  const hostRoleName = user.active_role === 'bnb_host' ? 'BnB Host' : 
                      user.active_role === 'hotel_host' ? 'Hotel Host' : 'Host';

  const getRoleIcon = () => {
    switch (user.active_role) {
      case 'bnb_host':
        return <HomeModernIcon className="w-5 h-5" />;
      case 'hotel_host':
        return <BuildingOfficeIcon className="w-5 h-5" />;
      
      default:
        return <UserIcon className="w-5 h-5" />;
    }
  };

  const getRoleDescription = () => {
    switch (user.active_role) {
      case 'bnb_host':
        return 'Manage your BnB properties, view bookings, and update listings';
      case 'hotel_host':
        return 'Manage your hotel accommodations, rooms, and guest services';
      
      default:
        return 'Browse and book accommodations and services';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHostMode 
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getRoleIcon()}
              <span className="font-semibold">
                {isHostMode ? `${hostRoleName} Mode` : 'Guest Mode'}
              </span>
              {isHostMode && (
                <CheckCircleIcon className="w-4 h-4 text-green-200" />
              )}
            </div>
            <div className="hidden sm:block text-sm opacity-90">
              {getRoleDescription()}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <span className="hidden sm:inline">Current Role:</span>
            <span className="font-medium">{hostRoleName}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HostModeIndicator;
