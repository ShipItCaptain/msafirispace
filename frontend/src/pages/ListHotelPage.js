import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import { buildAmenityIndex, normalizeAmenityToken, resolveHotelAmenityName } from '../utils/hotelAmenities';

const ListHotelPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    description: '',
    short_description: '',
    
    // Property Details
    property_type: 'hotel',
    star_rating: 3,
    
    // Location Information
    address: '',
    city: '',
    state_province: '',
    country: 'Kenya',
    postal_code: '',
    latitude: '',
    longitude: '',
    
    // Contact Information
    phone: '',
    email: '',
    
    // Images
    images: [],
    
    // Amenities
    amenities: []
  });

  const propertyTypes = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'resort', label: 'Resort' },
    { value: 'boutique_hotel', label: 'Boutique Hotel' },
    { value: 'business_hotel', label: 'Business Hotel' },
    { value: 'luxury_hotel', label: 'Luxury Hotel' },
    { value: 'budget_hotel', label: 'Budget Hotel' },
    { value: 'bed_and_breakfast', label: 'Bed & Breakfast' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' }
  ];

  const availableAmenities = [
    { id: 1, name: 'Free WiFi', category: 'general' },
    { id: 2, name: 'Parking', category: 'general' },
    { id: 3, name: 'Swimming Pool', category: 'recreation' },
    { id: 4, name: 'Fitness Center', category: 'recreation' },
    { id: 5, name: 'Restaurant', category: 'dining' },
    { id: 6, name: 'Bar', category: 'dining' },
    { id: 7, name: 'Room Service', category: 'dining' },
    
    { id: 9, name: 'Business Center', category: 'business' },
    { id: 10, name: 'Meeting Rooms', category: 'business' },
    { id: 11, name: 'Conference Facilities', category: 'business' },
    { id: 12, name: 'Spa', category: 'recreation' },
    { id: 13, name: 'Tennis Court', category: 'recreation' },
    { id: 14, name: 'Airport Shuttle', category: 'transportation' },
    { id: 15, name: '24/7 Front Desk', category: 'general' },
    { id: 16, name: 'Air Conditioning', category: 'room' },
    { id: 17, name: 'Minibar', category: 'room' },
    { id: 18, name: 'Safe', category: 'room' },
    { id: 19, name: 'Breakfast Included', category: 'dining' }
  ];

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Hotel name and description' },
    { number: 2, title: 'Location', description: 'Address and coordinates' },
    { number: 3, title: 'Contact Details', description: 'Phone and email' },
    { number: 4, title: 'Photos', description: 'Upload hotel images' },
    { number: 5, title: 'Amenities', description: 'Select available amenities' },
    { number: 6, title: 'Review & Submit', description: 'Review and submit listing' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      is_primary: formData.images.length === 0, // First image is primary by default
      image_type: 'exterior'
    }));
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const setPrimaryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        is_primary: i === index
      }))
    }));
  };

  const toggleAmenity = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Hotel name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.short_description.trim()) newErrors.short_description = 'Short description is required';
        if (formData.short_description.length > 500) newErrors.short_description = 'Short description must be less than 500 characters';
        break;
      case 2:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.country.trim()) newErrors.country = 'Country is required';
        break;
      case 3:
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;
      case 4:
        if (formData.images.length === 0) newErrors.images = 'At least one image is required';
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const extractErrorMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'Failed to create listing. Please try again.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length > 0) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
    if (firstKey && typeof data[firstKey] === 'string') {
      return `${firstKey}: ${data[firstKey]}`;
    }
    return error?.message || 'Failed to create listing. Please try again.';
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    let created = null;
    try {
      const { listingsAPI } = await import('../services/api');

      const payload = {
        name: formData.name,
        description: formData.description,
        short_description: formData.short_description,
        property_type: formData.property_type,
        star_rating: formData.star_rating,
        address: formData.address,
        city: formData.city,
        state_province: formData.state_province,
        country: formData.country,
        postal_code: formData.postal_code,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        phone: formData.phone,
        email: formData.email,
      };

      // Only this call can fail with nothing yet created — everything past
      // this point operates on a hotel that already exists, so a failure
      // here must never be reported the same way as a failure later on.
      created = await listingsAPI.createListing(payload);
      const hotelId = created.id;

      const problems = [];

      const imageUploads = (formData.images || [])
        .filter((img) => img?.file)
        .map((img, index) => listingsAPI.uploadHotelImage(hotelId, {
          file: img.file,
          image_type: img.image_type || 'exterior',
          is_primary: Boolean(img.is_primary),
          order: index,
          caption: img.caption || '',
        }));
      if (imageUploads.length) {
        const results = await Promise.allSettled(imageUploads);
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          problems.push(`${failed} of ${imageUploads.length} photo${imageUploads.length > 1 ? 's' : ''} failed to upload`);
        }
      }

      if ((formData.amenities || []).length) {
        const amenityResponse = await listingsAPI.getHotelAmenities();
        const amenityRows = amenityResponse?.results || amenityResponse || [];
        const amenityIndex = buildAmenityIndex(amenityRows);
        const selectedAmenityNames = formData.amenities
          .map((amenityId) => availableAmenities.find((a) => a.id === amenityId)?.name)
          .map(resolveHotelAmenityName)
          .filter(Boolean);
        const resolvedAmenityIds = selectedAmenityNames
          .map((name) => amenityIndex.get(normalizeAmenityToken(name)))
          .filter(Boolean);
        if (resolvedAmenityIds.length) {
          const results = await Promise.allSettled(
            resolvedAmenityIds.map((amenityId) => listingsAPI.addHotelAmenity(hotelId, amenityId))
          );
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) {
            problems.push(`${failed} of ${resolvedAmenityIds.length} amenit${resolvedAmenityIds.length > 1 ? 'ies' : 'y'} failed to save`);
          }
        }
        if (resolvedAmenityIds.length < selectedAmenityNames.length) {
          problems.push(`${selectedAmenityNames.length - resolvedAmenityIds.length} amenity selection(s) couldn't be matched`);
        }
      }

      if (problems.length) {
        toast.error(`Hotel created, but ${problems.join(' and ')}. You can fix this from Manage Rooms / Edit Hotel.`, { duration: 8000 });
      } else {
        toast.success('Hotel listed successfully!');
      }

      navigate(`/hotel/${created.id}`);
    } catch (error) {
      console.error('Error creating hotel listing:', error);
      if (created?.id) {
        // The hotel itself was created; only something after it failed.
        // Sending the host back to a blank step-1 form here would invite a
        // duplicate hotel on retry, so take them to the one that already
        // exists instead and tell them what still needs attention.
        toast.error(`Hotel created, but: ${extractErrorMessage(error)}. You can finish setup from Manage Rooms / Edit Hotel.`, { duration: 8000 });
        navigate(`/hotel/${created.id}`);
        return;
      }
      setErrors({ submit: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hotel Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your hotel name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                name="property_type"
                value={formData.property_type}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Star Rating *
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, star_rating: rating }))}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      formData.star_rating >= rating
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <StarSolidIcon className={`w-6 h-6 ${
                      formData.star_rating >= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <textarea
                name="short_description"
                value={formData.short_description}
                onChange={handleInputChange}
                rows={3}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.short_description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Brief description (max 500 characters)"
              />
              <div className="flex justify-between mt-1">
                {errors.short_description && <p className="text-sm text-red-600">{errors.short_description}</p>}
                <p className="text-sm text-gray-500 ml-auto">{formData.short_description.length}/500</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Detailed description of your hotel, facilities, and what makes it special"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Street address, building name, etc."
              />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="City"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  name="state_province"
                  value={formData.state_province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="State or Province"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.country ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Country"
                />
                {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Postal Code"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., -1.2921"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g., 36.8219"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., +254 20 123 4567"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., info@yourhotel.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hotel Photos *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Upload hotel photos</p>
                <p className="text-gray-500 mb-4">Drag and drop images here, or click to select</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors cursor-pointer inline-block"
                >
                  Choose Photos
                </label>
              </div>
              {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
            </div>

            {formData.images.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-700 mb-4">Uploaded Photos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.preview}
                        alt={`Hotel ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                          <button
                            onClick={() => setPrimaryImage(index)}
                            className={`p-2 rounded-full ${
                              image.is_primary ? 'bg-red-600 text-white' : 'bg-white text-gray-700'
                            }`}
                            title="Set as primary"
                          >
                            <StarSolidIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeImage(index)}
                            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                            title="Remove image"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {image.is_primary && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-4">Select Amenities</h4>
              <p className="text-gray-500 mb-6">Choose all amenities available at your hotel</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableAmenities.map(amenity => (
                  <label
                    key={amenity.id}
                    className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.amenities.includes(amenity.id)
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      formData.amenities.includes(amenity.id)
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.amenities.includes(amenity.id) && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-700 mb-4">Review Your Listing</h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-700">Hotel Information</h5>
                  <p className="text-gray-600">{formData.name}</p>
                  <p className="text-gray-600">{propertyTypes.find(t => t.value === formData.property_type)?.label}</p>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarSolidIcon
                        key={i}
                        className={`w-4 h-4 ${
                          i < formData.star_rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">({formData.star_rating} stars)</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700">Location</h5>
                  <p className="text-gray-600">{formData.address}</p>
                  <p className="text-gray-600">{formData.city}, {formData.country}</p>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700">Contact</h5>
                  <p className="text-gray-600">{formData.phone}</p>
                  <p className="text-gray-600">{formData.email}</p>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700">Photos</h5>
                  <p className="text-gray-600">{formData.images.length} photos uploaded</p>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700">Amenities</h5>
                  <p className="text-gray-600">{formData.amenities.length} amenities selected</p>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">List Your Hotel</h1>
              <p className="text-gray-600">Create a listing and start welcoming guests</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <div className="ml-4 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-16 h-0.5 ml-4 ${
                    currentStep > step.number ? 'bg-red-600' : 'bg-gray-300'
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
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>

          {renderStepContent()}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Listing...</span>
                </>
              ) : (
                <span>Create Listing</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListHotelPage;
