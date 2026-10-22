import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { bnbAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { propertyTypes } from '../utils/bnbOptions';
import { fetchUserMe } from '../store/slices/authSlice';

const inputClasses = 'w-full px-4 py-3 border border-gray-300 rounded-none text-base focus:ring-2 focus:ring-red-500 focus:border-transparent';

// The quick-create form for a new BnB listing -- deliberately just the
// essentials (title, type, city, an optional description). Everything else
// -- location detail, pricing, property details, amenities, photos, house
// rules -- is filled in afterward from the listing's own dashboard page, the
// same short-form-then-dashboard shape the hotel wizard already uses. The
// listing is created as a draft (is_active: false) and only goes live once
// the host explicitly publishes it from Review & Publish.
const BnBCreatePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
    title: '',
    property_type: 'apartment',
    city: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const extractErrorMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'There was an error creating your listing.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length > 0) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
    if (firstKey && typeof data[firstKey] === 'string') {
      return `${firstKey}: ${data[firstKey]}`;
    }
    return error?.message || 'There was an error creating your listing.';
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Property title is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const created = await bnbAPI.create({
        title: formData.title,
        property_type: formData.property_type,
        city: formData.city,
        description: formData.description,
        is_active: false,
      });
      showSuccess('Listing Started', "Now add your property's details whenever you're ready.", 5000);
      // Creating a listing grants the bnb_host role server-side
      // (BnBListingListCreateView.perform_create) -- refresh the Redux user
      // state before navigating into the role-gated /host/bnb/:id route, or
      // a first-time host gets bounced home by RoleGuard on stale roles.
      await dispatch(fetchUserMe()).unwrap().catch(() => {});
      navigate(`/host/bnb/${created.id}`);
    } catch (error) {
      showError('Create Failed', extractErrorMessage(error), 7000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-none shadow-lg border border-gray-100 p-8">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">List your property</h1>
              <p className="text-sm text-gray-500 mb-4">
                A couple quick details to get started -- you'll add location, pricing, photos and
                more from your dashboard next.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/host/home')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 border-t border-gray-200 pt-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={inputClasses}
                placeholder="e.g., Cozy Downtown Apartment"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => handleChange('property_type', e.target.value)}
                className={inputClasses}
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={inputClasses}
                placeholder="e.g., Nairobi"
              />
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400 font-normal">(optional for now)</span>
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={inputClasses}
                placeholder="A short line about your property -- you can expand this later"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-3 bg-red-600 text-white rounded-none font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BnBCreatePage;
