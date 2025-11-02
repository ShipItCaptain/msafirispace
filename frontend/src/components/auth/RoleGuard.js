import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  HomeIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const RoleGuard = ({ 
  children, 
  allowedRoles = [], 
  fallbackPath = '/',
  showAccessDenied = true 
}) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  console.log('RoleGuard - User:', user);
  console.log('RoleGuard - Allowed roles:', allowedRoles);
  console.log('RoleGuard - User active_role:', user?.active_role);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('RoleGuard - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If no user data yet, show loading
  if (!user) {
    console.log('RoleGuard - No user data, showing loading');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // If no roles specified, allow access
  if (allowedRoles.length === 0) {
    console.log('RoleGuard - No roles specified, allowing access');
    return children;
  }

  // Check if user's active role is in allowed roles
  const hasAccess = allowedRoles.includes(user.active_role);
  console.log('RoleGuard - Has access:', hasAccess);

  if (!hasAccess) {
    if (!showAccessDenied) {
      return <Navigate to={fallbackPath} replace />;
    }

    // Show access denied page
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. This page is only available to users with the following roles:
          </p>
          
          <div className="space-y-2 mb-6">
            {allowedRoles.map((role) => {
              const roleConfig = {
                guest: { label: 'Guest', icon: HomeIcon, description: 'Browse and book services' },
                bnb_host: { label: 'BnB Host', icon: HomeModernIcon, description: 'Manage BnB properties' },
                hotel_host: { label: 'Hotel Host', icon: BuildingOfficeIcon, description: 'Manage hotel accommodations' },
                
              };
              
              const config = roleConfig[role];
              const IconComponent = config?.icon || HomeIcon;
              
              return (
                <div key={role} className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <IconComponent className="w-4 h-4" />
                  <span>{config?.label || role}</span>
                </div>
              );
            })}
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Your current role: <span className="font-medium text-gray-900">
                {user.active_role === 'guest' ? 'Guest' : 
                 user.active_role === 'bnb_host' ? 'BnB Host' :
                 user.active_role === 'hotel_host' ? 'Hotel Host' :
                 user.active_role}
              </span>
            </p>
            
            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Go Back
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = fallbackPath}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                Go Home
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return children;
};

export default RoleGuard;
