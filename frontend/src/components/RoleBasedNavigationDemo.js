import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  HomeIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  SparklesIcon,
  UserIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const RoleBasedNavigationDemo = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return null;
  }

  const getNavigationForRole = (role) => {
    switch (role) {
      case 'guest':
        return [
          { name: 'Home Page', href: '/', icon: HomeIcon, description: 'Browse all services' },
          { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon, description: 'Book hotel rooms' },
          { name: 'BnBs', href: '/bnbs', icon: HomeModernIcon, description: 'Book BnB stays' },
          
        ];
      case 'bnb_host':
        return [
          { name: 'Home Page', href: '/', icon: HomeIcon, description: 'Return to homepage' },
          { name: 'Manage BnBs', href: '/host/bnb', icon: HomeModernIcon, description: 'Manage your BnB listings' },
        ];
      case 'hotel_host':
        return [
          { name: 'Home Page', href: '/', icon: HomeIcon, description: 'Return to homepage' },
          { name: 'Manage Hotels', href: '/host/hotels', icon: BuildingOfficeIcon, description: 'Manage your hotel listings' },
        ];
      
      default:
        return [];
    }
  };

  const currentRole = user.active_role || 'guest';
  const navigation = getNavigationForRole(currentRole);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Role-Based Navigation</h3>
          <p className="text-sm text-gray-600">
            Your current role: <span className="font-medium text-primary-600">
              {currentRole === 'guest' ? 'Guest' : 
               currentRole === 'bnb_host' ? 'BnB Host' :
               currentRole === 'hotel_host' ? 'Hotel Host' :
               currentRole === 'concierge_host' ? 'Concierge Host' : currentRole}
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <UserIcon className="w-4 h-4" />
          <span>Switch roles in the profile menu</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {navigation.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <IconComponent className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> When you switch roles using the profile menu, 
          the navigation automatically updates to show only the relevant options for your current role. 
          Guests see booking options, while hosts see management options.
        </p>
      </div>
    </motion.div>
  );
};

export default RoleBasedNavigationDemo;
