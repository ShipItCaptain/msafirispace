import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const HostSignupForm = ({ formData, setFormData, errors, handleInputChange, onSubmit, isSubmitting, isLoading }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Host types configuration
  const hostTypes = [
    {
      id: 'bnb_host',
      name: 'BnB Host',
      description: 'Rent out your home or property',
      icon: HomeIcon,
      features: ['Property listings', 'Booking management', 'Guest communication']
    },
    {
      
      description: 'Provide travel and lifestyle services',
      icon: SparklesIcon,
      features: ['Service listings', 'Request management', 'Client communication']
    },
    {
      id: 'hotel_restaurant_host',
      name: 'Hotel/Restaurant Host',
      description: 'Manage hotels, restaurants, or both',
      icon: BuildingOfficeIcon,
      features: ['Property management', 'Room/table bookings', 'Staff management']
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Ensure we have at least one host role selected
    const hostRoles = formData.roles.filter(role => 
      ['bnb_host', 'hotel_restaurant_host'].includes(role)
    );
    
    if (hostRoles.length === 0) {
      // Add a default host role if none selected
      hostRoles.push('bnb_host');
    }
    
    const hostFormDataToSubmit = {
      ...formData,
      roles: ['guest', ...hostRoles], // Always include guest role
      user_type: 'host'
    };
    
    onSubmit(e, hostFormDataToSubmit, agreedToTerms);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Join as a Host</h3>
        <p className="text-sm text-gray-600 mt-1">
          Create your account to offer accommodations and services
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <div className="mt-1">
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={formData.first_name}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                  errors.first_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John"
              />
            </div>
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {errors.first_name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <div className="mt-1">
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={formData.last_name}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                  errors.last_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Doe"
              />
            </div>
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {errors.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="mt-1">
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleInputChange}
              className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+254 700 123 456"
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {errors.phone}
            </p>
          )}
        </div>

        {/* Host Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select your host type(s):
          </label>
          <div className="space-y-3">
            {hostTypes.map((hostType) => {
              const IconComponent = hostType.icon;
              const isSelected = formData.roles.includes(hostType.id);
              return (
                <label
                  key={hostType.id}
                  className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const roleId = hostType.id;
                      setFormData(prev => ({
                        ...prev,
                        roles: e.target.checked
                          ? [...prev.roles, roleId]
                          : prev.roles.filter(r => r !== roleId)
                      }));
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <IconComponent className="w-6 h-6 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{hostType.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{hostType.description}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        {hostType.features.join(' • ')}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            You can select multiple host types and switch between them anytime.
          </p>
        </div>

        {/* Company Information */}
        <div className="space-y-4">
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Company/Business Name *
            </label>
            <div className="mt-1">
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                  errors.company_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your company or business name"
              />
            </div>
            {errors.company_name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {errors.company_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="business_license" className="block text-sm font-medium text-gray-700">
                Business License
              </label>
              <div className="mt-1">
                <input
                  id="business_license"
                  name="business_license"
                  type="text"
                  value={formData.business_license}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="License number (optional)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">
                Tax ID
              </label>
              <div className="mt-1">
                <input
                  id="tax_id"
                  name="tax_id"
                  type="text"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="Tax ID (optional)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <div className="mt-1">
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="Kenya">Kenya</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Uganda">Uganda</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <div className="mt-1">
              <input
                id="city"
                name="city"
                type="text"
                autoComplete="address-level2"
                value={formData.city}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                  errors.city ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nairobi"
              />
            </div>
            {errors.city && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {errors.city}
              </p>
            )}
          </div>
        </div>

        {/* Password Fields */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm pr-10 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1 relative">
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm pr-10 ${
                errors.confirm_password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {errors.confirm_password}
            </p>
          )}
        </div>

        {/* Referral Code (Optional) */}
        <div>
          <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700">
            Referral Code (Optional)
          </label>
          <div className="mt-1">
            <input
              id="referral_code"
              name="referral_code"
              type="text"
              value={formData.referral_code}
              onChange={handleInputChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Enter referral code if you have one"
            />
          </div>
        </div>

        {/* Terms Agreement */}
        <div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-700">
                I agree to the{' '}
                <a href="/terms" className="text-red-600 hover:text-red-500 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-red-600 hover:text-red-500 font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {errors.terms}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting || isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating account...
              </div>
            ) : (
              'Create Host Account'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default HostSignupForm;
