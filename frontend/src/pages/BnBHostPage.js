import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import { 
  HomeModernIcon,
  ArrowLeftIcon,
  CheckIcon,
  PhotoIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const BnBHostPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    propertyName: '',
    propertyType: '',
    hostName: '',
    email: '',
    phone: '',
    website: '',
    
    // Location
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    
    // Pricing
    basePrice: '',
    currency: 'KES',
    weeklyDiscount: '',
    monthlyDiscount: '',
    cleaningFee: '',
    serviceFee: '',
    
    // Property Details
    propertyDescription: '',
    roomCount: '',
    guestCapacity: '',
    bathroomCount: '',
    propertySize: '',
    propertyAge: '',
    bedType: '',
    bedroomCount: '',
    
    // Amenities
    amenities: [],
    propertyFeatures: [],
    safetyFeatures: [],
    
    // Photos
    photos: [],
    
    // House Rules
    guestInteractionLevel: '',
    propertyManagementStyle: '',
    houseRules: '',
    checkInTime: '',
    checkOutTime: '',
    cancellationPolicy: ''
  });

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Tell us about your property' },
    { number: 2, title: 'Location', description: 'Where is your property located?' },
    { number: 3, title: 'Pricing', description: 'Set your rates and pricing' },
    { number: 4, title: 'Property Details', description: 'Describe your property details' },
    { number: 5, title: 'Amenities', description: 'Select amenities and features' },
    { number: 6, title: 'Photos', description: 'Upload photos of your property' },
    { number: 7, title: 'House Rules', description: 'Set your hosting style and rules' },
    { number: 8, title: 'Review & Publish', description: 'Review and publish your listing' }
  ];

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'condo', label: 'Condominium' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'loft', label: 'Loft' },
    { value: 'townhouse', label: 'Townhouse' }
  ];

  const guestInteractionLevels = [
    { value: 'minimal', label: 'Minimal - I prefer minimal interaction' },
    { value: 'moderate', label: 'Moderate - I enjoy meeting guests occasionally' },
    { value: 'high', label: 'High - I love interacting with guests' }
  ];

  const managementStyles = [
    { value: 'self_managed', label: 'Self-Managed' },
    { value: 'property_manager', label: 'Property Manager' },
    { value: 'hybrid', label: 'Hybrid' }
  ];

  const amenities = [
    'WiFi', 'Kitchen', 'Parking', 'Pool', 'Gym', 'Garden', 'Balcony', 
    'Terrace', 'Fireplace', 'Air Conditioning', 'Heating', 'Washing Machine',
    'Dryer', 'Dishwasher', 'Microwave', 'Coffee Maker', 'TV', 'Sound System',
    'Workspace', 'High Chair', 'Crib', 'Pet Friendly'
  ];

  const propertyFeatures = [
    'Ocean View', 'Mountain View', 'City View', 'Garden View', 'Pool View',
    'Private Entrance', 'Private Bathroom', 'Private Kitchen', 'Private Living Room',
    'Shared Spaces', 'Outdoor Space', 'Rooftop Access', 'Basement'
  ];

  const safetyFeatures = [
    'Smoke Detector', 'Carbon Monoxide Detector', 'First Aid Kit', 'Fire Extinguisher',
    'Security System', 'Safe', 'Lock on Bedroom Door', 'Security Cameras',
    'Well-lit Path to Entrance', 'Deadbolt Lock'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log(`Updated ${field}:`, value);
      return newData;
    });
  };

  const handleArrayChange = (field, value, isChecked) => {
    setFormData(prev => ({
      ...prev,
      [field]: isChecked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'propertyName', 'propertyType', 'hostName', 'email', 'phone',
      'address', 'city', 'state', 'country', 'propertyDescription'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    if (formData.photos.length === 0) {
      alert('Please upload at least one property photo.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    try {
      // Validate form before submission
      if (!validateForm()) {
        return;
      }
      
      console.log('Submitting BnB host data:', formData);
      console.log('Form validation passed, preparing submission data...');
      
      // Create FormData for file uploads
      const formDataToSubmit = new FormData();
      
      // Add basic information
      formDataToSubmit.append('host_type', 'bnb_host');
      formDataToSubmit.append('property_name', formData.propertyName);
      formDataToSubmit.append('contact_person', formData.hostName);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone', formData.phone);
      if (formData.website) {
        formDataToSubmit.append('website', formData.website);
      }
      
      // Add location
      formDataToSubmit.append('address', formData.address);
      formDataToSubmit.append('city', formData.city);
      formDataToSubmit.append('state', formData.state);
      formDataToSubmit.append('country', formData.country);
      if (formData.postalCode) {
        formDataToSubmit.append('postal_code', formData.postalCode);
      }
      
      // Add property details
      formDataToSubmit.append('property_description', formData.propertyDescription);
      formDataToSubmit.append('property_type', formData.propertyType);
      if (formData.roomCount) {
        formDataToSubmit.append('room_count', formData.roomCount);
      }
      if (formData.guestCapacity) {
        formDataToSubmit.append('guest_capacity', formData.guestCapacity);
      }
      if (formData.bathroomCount) {
        formDataToSubmit.append('bathroom_count', formData.bathroomCount);
      }
      if (formData.propertySize) {
        formDataToSubmit.append('property_size', formData.propertySize);
      }
      if (formData.propertyAge) {
        formDataToSubmit.append('property_age', formData.propertyAge);
      }
      
      // Add arrays as JSON strings
      formDataToSubmit.append('amenities', JSON.stringify(formData.amenities));
      formDataToSubmit.append('property_features', JSON.stringify(formData.propertyFeatures));
      formDataToSubmit.append('safety_features', JSON.stringify(formData.safetyFeatures));
      
      // Add hosting preferences
      if (formData.guestInteractionLevel) {
        formDataToSubmit.append('guest_interaction_level', formData.guestInteractionLevel);
      }
      if (formData.propertyManagementStyle) {
        formDataToSubmit.append('property_management_style', formData.propertyManagementStyle);
      }
      if (formData.houseRules) {
        formDataToSubmit.append('house_rules', formData.houseRules);
      }
      if (formData.checkInTime) {
        formDataToSubmit.append('check_in_time', formData.checkInTime);
      }
      if (formData.checkOutTime) {
        formDataToSubmit.append('check_out_time', formData.checkOutTime);
      }
      
      // Add photos
      formData.photos.forEach((photo, index) => {
        formDataToSubmit.append(`photos`, photo);
      });

      // Submit to backend using FormData
      console.log('Submitting data to backend with FormData');
      const response = await authAPI.onboardHostFormData(formDataToSubmit);
      console.log('Host onboarding successful:', response);
      
      // Navigate to host dashboard
      navigate('/host-dashboard');
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Invalid data provided. Please check your form.';
        alert(`Validation Error: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        alert('Authentication error. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 500) {
        alert('Server error. Please try again later.');
      } else {
        alert(`Error submitting form: ${error.message}. Please try again.`);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name *
              </label>
              <input
                type="text"
                value={formData.propertyName}
                onChange={(e) => handleInputChange('propertyName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Give your property a memorable name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select property type</option>
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Host Name *
                </label>
                <input
                  type="text"
                  value={formData.hostName}
                  onChange={(e) => handleInputChange('hostName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+254 700 000 000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://your-website.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nairobi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nairobi County"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Kenya"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="00100"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price Per Night *
              </label>
              <div className="flex items-center">
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => handleInputChange('basePrice', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.weeklyDiscount}
                  onChange={(e) => handleInputChange('weeklyDiscount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Discount (%)
                </label>
                <input
                  type="number"
                  value={formData.monthlyDiscount}
                  onChange={(e) => handleInputChange('monthlyDiscount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cleaning Fee
                </label>
                <input
                  type="number"
                  value={formData.cleaningFee}
                  onChange={(e) => handleInputChange('cleaningFee', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Fee
                </label>
                <input
                  type="number"
                  value={formData.serviceFee}
                  onChange={(e) => handleInputChange('serviceFee', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="300"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Description *
              </label>
              <textarea
                value={formData.propertyDescription}
                onChange={(e) => handleInputChange('propertyDescription', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe your property and what makes it special..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rooms
                </label>
                <input
                  type="number"
                  value={formData.roomCount}
                  onChange={(e) => handleInputChange('roomCount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Capacity
                </label>
                <input
                  type="number"
                  value={formData.guestCapacity}
                  onChange={(e) => handleInputChange('guestCapacity', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="4"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.bathroomCount}
                  onChange={(e) => handleInputChange('bathroomCount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Size (sq ft)
                </label>
                <input
                  type="number"
                  value={formData.propertySize}
                  onChange={(e) => handleInputChange('propertySize', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Age (years)
                </label>
                <input
                  type="number"
                  value={formData.propertyAge}
                  onChange={(e) => handleInputChange('propertyAge', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>
            </div>

          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenities.map(amenity => (
                  <label key={amenity} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={(e) => handleArrayChange('amenities', amenity, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {propertyFeatures.map(feature => (
                  <label key={feature} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.propertyFeatures.includes(feature)}
                      onChange={(e) => handleArrayChange('propertyFeatures', feature, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Safety Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {safetyFeatures.map(feature => (
                  <label key={feature} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.safetyFeatures.includes(feature)}
                      onChange={(e) => handleArrayChange('safetyFeatures', feature, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Photos *
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Upload high-quality photos of your property. Include photos of bedrooms, bathrooms, kitchen, living areas, and exterior.
              </p>
              
              {/* Image Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors duration-200">
                <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setFormData(prev => ({
                      ...prev,
                      photos: [...prev.photos, ...files]
                    }));
                  }}
                  className="hidden"
                  id="property-photos"
                />
                <label htmlFor="property-photos" className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-700">Click to upload photos</span>
                  <p className="text-sm text-gray-500 mt-2">or drag and drop multiple images</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 10MB each</p>
                </label>
              </div>

              {/* Uploaded Images Preview */}
              {formData.photos.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Uploaded Photos ({formData.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Property photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== index)
                            }));
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Interaction Level
              </label>
              <div className="space-y-3">
                {guestInteractionLevels.map(level => (
                  <label key={level.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="guestInteractionLevel"
                      value={level.value}
                      checked={formData.guestInteractionLevel === level.value}
                      onChange={(e) => handleInputChange('guestInteractionLevel', e.target.value)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Management Style
              </label>
              <select
                value={formData.propertyManagementStyle}
                onChange={(e) => handleInputChange('propertyManagementStyle', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select management style</option>
                {managementStyles.map(style => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                House Rules
              </label>
              <textarea
                value={formData.houseRules}
                onChange={(e) => handleInputChange('houseRules', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="List your house rules (e.g., No smoking, No pets, Quiet hours after 10 PM...)"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => handleInputChange('checkInTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => handleInputChange('checkOutTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Policy
              </label>
              <select
                value={formData.cancellationPolicy}
                onChange={(e) => handleInputChange('cancellationPolicy', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select cancellation policy</option>
                <option value="flexible">Flexible - Full refund 1 day prior to arrival</option>
                <option value="moderate">Moderate - Full refund 5 days prior to arrival</option>
                <option value="strict">Strict - Full refund up to 30 days, or 50% up to 14 days</option>
              </select>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Property Name:</span> {formData.propertyName || 'Not provided'}</p>
                    <p><span className="font-medium">Property Type:</span> {formData.propertyType || 'Not provided'}</p>
                    <p><span className="font-medium">Host Name:</span> {formData.hostName || 'Not provided'}</p>
                    <p><span className="font-medium">Email:</span> {formData.email || 'Not provided'}</p>
                    <p><span className="font-medium">Phone:</span> {formData.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Location</h4>
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Address:</span> {formData.address || 'Not provided'}</p>
                    <p><span className="font-medium">City:</span> {formData.city || 'Not provided'}</p>
                    <p><span className="font-medium">Country:</span> {formData.country || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Pricing</h4>
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Base Price:</span> {formData.basePrice ? `${formData.currency} ${formData.basePrice}` : 'Not set'}</p>
                    <p><span className="font-medium">Cleaning Fee:</span> {formData.cleaningFee || 'Not set'}</p>
                    <p><span className="font-medium">Service Fee:</span> {formData.serviceFee || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Property Details</h4>
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="font-medium">Rooms:</span> {formData.roomCount || 'Not specified'}</p>
                    <p><span className="font-medium">Capacity:</span> {formData.guestCapacity || 'Not specified'} guests</p>
                    <p><span className="font-medium">Bathrooms:</span> {formData.bathroomCount || 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">House Rules</h4>
                  <div className="bg-white rounded-lg p-4 text-sm">
                    <p>{formData.houseRules || 'No rules specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-lg">
              <input
                type="checkbox"
                id="confirm-listing"
                className="mt-1"
                required
              />
              <label htmlFor="confirm-listing" className="text-sm text-gray-700">
                I confirm that all information provided is accurate and I agree to publish this listing on Msafiri Space.
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/become-host"
            className="inline-flex items-center text-gray-600 hover:text-primary-500 transition-colors duration-200 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Host Types
          </Link>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HomeModernIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BnB Host Setup</h1>
              <p className="text-gray-600">Complete your profile to start hosting</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center min-w-fit">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 ${
                  currentStep >= step.number
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-semibold">{step.number}</span>
                  )}
                </div>
                <div className="ml-2 hidden md:block">
                  <p className={`text-xs font-medium whitespace-nowrap ${
                    currentStep >= step.number ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden md:block w-6 h-0.5 mx-2 ${
                    currentStep > step.number ? 'bg-primary-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {steps[currentStep - 1].title}
          </h2>
          
          {renderStepContent()}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          
          <div className="flex space-x-4">
            {/* Debug button - remove in production */}
            <button
              onClick={() => {
                console.log('Current form data:', formData);
                console.log('Form validation result:', validateForm());
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors duration-200"
            >
              Debug Form
            </button>
            
            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors duration-200"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors duration-200"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BnBHostPage;
