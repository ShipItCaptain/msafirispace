import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  UserIcon,
  HomeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const RoleIndicator = ({ showLabel = true, size = 'sm' }) => {
  const { user } = useAuth();

  if (!user) return null;

  const roleConfig = {
    guest: { icon: UserIcon, label: 'Guest', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    bnb_host: { icon: HomeIcon, label: 'BnB Host', color: 'text-green-600', bgColor: 'bg-green-50' },
    hotel_host: { icon: BuildingOfficeIcon, label: 'Hotel Host', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  };

  const currentRole = roleConfig[user.active_role] || roleConfig.guest;
  const IconComponent = currentRole.icon;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 ${currentRole.bgColor} rounded-full`}>
      <IconComponent className={`${sizeClasses[size]} ${currentRole.color}`} />
      {showLabel && (
        <span className={`${textSizeClasses[size]} font-medium ${currentRole.color}`}>
          {currentRole.label}
        </span>
      )}
    </div>
  );
};

export default RoleIndicator;
