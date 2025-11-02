import React from 'react';
import { motion } from 'framer-motion';
import { UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const FormSwitcher = ({ 
  isHostForm, 
  onSwitchToGuest, 
  onSwitchToHost, 
  guestFormData, 
  hostFormData, 
  setFormData 
}) => {
  const handleSwitchToGuest = () => {
    // Save current form data before switching
    if (isHostForm) {
      // Save host form data to hostFormData state
      // This would be handled by the parent component
    }
    onSwitchToGuest();
  };

  const handleSwitchToHost = () => {
    // Save current form data before switching
    if (!isHostForm) {
      // Save guest form data to guestFormData state
      // This would be handled by the parent component
    }
    onSwitchToHost();
  };

  return (
    <div className="mb-6">
      {/* Form Type Selector */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={handleSwitchToGuest}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            !isHostForm
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserIcon className="w-4 h-4 mr-2" />
          Guest Signup
        </button>
        <button
          type="button"
          onClick={handleSwitchToHost}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            isHostForm
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4 mr-2" />
          Host Signup
        </button>
      </div>

      {/* Form Description */}
      <motion.div
        key={isHostForm ? 'host' : 'guest'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {!isHostForm ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Join as a Guest</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create your account to book accommodations and services
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Join as a Host</h3>
            <p className="text-sm text-gray-600 mt-1">
              Create your account to offer accommodations and services
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FormSwitcher;
