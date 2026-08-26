import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UsersIcon,
  WifiIcon,
  PhotoIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const MAX_PHOTO_COUNT = 20;
const MAX_PHOTO_SIZE_MB = 15;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

const ComprehensiveBnBForm = ({ editingListing, onClose, onSave }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    description: '',
    propertyType: 'apartment',
    location: '',
    address: '',
    city: '',
    country: 'Kenya',
    
    // Pricing & Availability
    pricePerNight: '',
    securityDeposit: '',
    minimumNights: 1,
    maximumNights: 30,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    
    // Property Details
    bedrooms: '',
    bathrooms: '',
    guests: '',
    beds: '',
    squareFootage: '',
    
    // Amenities
    amenities: [],
    
    // House Rules
    houseRules: [],
    smokingAllowed: false,
    petsAllowed: false,
    partiesAllowed: false,
    childrenAllowed: true,
    
    // Photos
    photos: [],
    
    // Contact & Host Info
    hostName: '',
    hostPhone: '',
    hostEmail: '',
    emergencyContact: '',
    
    // Additional Info
    highlights: [],
    transportation: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploadMessages, setPhotoUploadMessages] = useState([]);

  const steps = [
    { id: 1, title: 'Basic Info', icon: HomeIcon },
    { id: 2, title: 'Location', icon: MapPinIcon },
    { id: 3, title: 'Pricing', icon: CurrencyDollarIcon },
    { id: 4, title: 'Property Details', icon: UsersIcon },
    { id: 5, title: 'Amenities', icon: WifiIcon },
    { id: 6, title: 'Photos', icon: PhotoIcon },
    { id: 7, title: 'House Rules', icon: ShieldCheckIcon },
    { id: 8, title: 'Review & Publish', icon: CheckCircleIcon }
  ];

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
    { value: 'condo', label: 'Condo' },
    { value: 'studio', label: 'Studio' },
    { value: 'loft', label: 'Loft' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'cabin', label: 'Cabin' },
    { value: 'other', label: 'Other' }
  ];

  const amenityCategories = {
    'Essentials': [
      'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
      'Dedicated workspace', 'TV', 'Hair dryer', 'Iron'
    ],
    'Features': [
      'Pool', 'Hot tub', 'Free parking', 'EV charger', 'Gym', 'BBQ grill',
      'Fireplace', 'Balcony', 'Patio', 'Garden'
    ],
    'Safety': [
      'Smoke alarm', 'Carbon monoxide alarm', 'Fire extinguisher',
      'First aid kit', 'Security cameras', 'Safe'
    ],
    'Accessibility': [
      'Step-free access', 'Wide doorway', 'Wide clearance to bed',
      'Accessible parking', 'Grab rails in bathroom'
    ]
  };

  const houseRulesOptions = [
    'No smoking',
    'No parties or events',
    'No pets',
    'No loud music after 10 PM',
    'No shoes inside',
    'Respect neighbors',
    'Keep noise levels down',
    'Clean up after yourself',
    'No unregistered guests',
    'Check-in after 3 PM only'
  ];

  useEffect(() => {
    if (editingListing) {
      // Convert existing image payloads into photo objects used by this form.
      const existingPhotos = Array.isArray(editingListing.images)
        ? editingListing.images.map((image, index) => ({
            id: image?.id || `existing-${index}`,
            file: null,
            preview: typeof image === 'string' ? image : image?.image || '',
            isExisting: true,
            is_primary: Boolean(image?.is_primary),
            localLoadProgress: 100,
            isLoadingPreview: false,
          }))
        : [];

      // Ensure there is always exactly one primary image marker for display purposes.
      if (existingPhotos.length > 0 && !existingPhotos.some((photo) => photo.is_primary)) {
        existingPhotos[0].is_primary = true;
      }

      setFormData((prev) => ({
        ...prev,
        ...editingListing,
        amenities: editingListing.amenities || [],
        houseRules: editingListing.houseRules || [],
        // Map images to photo objects for form compatibility
        photos: existingPhotos,
        // Map price to pricePerNight for form compatibility
        pricePerNight: editingListing.price || editingListing.pricePerNight || ''
      }));
    }
  }, [editingListing]);

  const normalizePrimaryPhoto = (photos) => {
    if (!photos.length) return photos;
    if (photos.some((photo) => photo.is_primary)) {
      return photos;
    }
    return photos.map((photo, index) => ({
      ...photo,
      is_primary: index === 0,
    }));
  };

  const readFileWithProgress = (file, onProgress) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.onload = () => {
        onProgress(100);
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const ensureImageCanRender = (dataUrl) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image preview failed'));
      img.src = dataUrl;
    });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleRuleToggle = (rule) => {
    setFormData(prev => ({
      ...prev,
      houseRules: prev.houseRules.includes(rule)
        ? prev.houseRules.filter(r => r !== rule)
        : [...prev.houseRules, rule]
    }));
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = '';
    if (!files.length) return;
    setErrors((prev) => ({ ...prev, photos: null }));

    const messages = [];
    const remainingSlots = Math.max(0, MAX_PHOTO_COUNT - formData.photos.length);
    if (remainingSlots === 0) {
      setPhotoUploadMessages([`You can upload up to ${MAX_PHOTO_COUNT} photos.`]);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      messages.push(`Only ${remainingSlots} photo slot(s) left. Extra files were ignored.`);
    }

    const validFiles = [];
    filesToProcess.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        messages.push(`${file.name}: unsupported format. Use JPG, PNG, WEBP, GIF, or HEIC.`);
        return;
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        messages.push(`${file.name}: file is too large. Max size is ${MAX_PHOTO_SIZE_MB}MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (!validFiles.length) {
      setPhotoUploadMessages(messages.length ? messages : ['No valid images selected.']);
      return;
    }

    const hasPrimary = formData.photos.some((photo) => photo.is_primary);
    const stagedPhotos = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: '',
      isExisting: false,
      is_primary: !hasPrimary && index === 0,
      localLoadProgress: 0,
      isLoadingPreview: true,
    }));

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...stagedPhotos],
    }));

    await Promise.all(
      stagedPhotos.map(async (stagedPhoto) => {
        try {
          const previewDataUrl = await readFileWithProgress(stagedPhoto.file, (progress) => {
            setFormData((prev) => ({
              ...prev,
              photos: prev.photos.map((photo) =>
                photo.id === stagedPhoto.id ? { ...photo, localLoadProgress: progress } : photo
              ),
            }));
          });
          await ensureImageCanRender(previewDataUrl);
          setFormData((prev) => ({
            ...prev,
            photos: prev.photos.map((photo) =>
              photo.id === stagedPhoto.id
                ? {
                    ...photo,
                    preview: previewDataUrl,
                    localLoadProgress: 100,
                    isLoadingPreview: false,
                  }
                : photo
            ),
          }));
        } catch (_) {
          messages.push(`${stagedPhoto.file.name}: failed to load preview. Please try another image.`);
          setFormData((prev) => {
            const updatedPhotos = normalizePrimaryPhoto(prev.photos.filter((photo) => photo.id !== stagedPhoto.id));
            return { ...prev, photos: updatedPhotos };
          });
        }
      })
    );

    setPhotoUploadMessages(messages);
    if (!messages.length) {
      setErrors((prev) => ({ ...prev, photos: null }));
    }
  };

  const handlePhotoRemove = (photoId) => {
    setFormData(prev => {
      const photoToRemove = prev.photos.find(p => p.id === photoId);
      if (photoToRemove && photoToRemove.preview && !photoToRemove.isExisting) {
        // Revoke object URL only for locally-created previews
        try {
          URL.revokeObjectURL(photoToRemove.preview);
        } catch (_) {}
      }
      const updatedPhotos = normalizePrimaryPhoto(prev.photos.filter(p => p.id !== photoId));
      return {
        ...prev,
        photos: updatedPhotos,
      };
    });
    setErrors((prev) => ({ ...prev, photos: null }));
  };

  const handleSetPrimaryPhoto = (photoId) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((photo) => ({
        ...photo,
        is_primary: photo.id === photoId,
      })),
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Property title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
        break;
      case 2:
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        break;
      case 3:
        if (!formData.pricePerNight || formData.pricePerNight <= 0) newErrors.pricePerNight = 'Valid price is required';
        break;
      case 4:
        if (!formData.bedrooms || formData.bedrooms <= 0) newErrors.bedrooms = 'Number of bedrooms is required';
        if (!formData.bathrooms || formData.bathrooms <= 0) newErrors.bathrooms = 'Number of bathrooms is required';
        if (!formData.guests || formData.guests <= 0) newErrors.guests = 'Maximum guests is required';
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 6 && formData.photos.some((photo) => photo.isLoadingPreview)) {
      setErrors((prev) => ({
        ...prev,
        photos: 'Please wait until image loading completes before continuing.',
      }));
      return;
    }
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (formData.photos.some((photo) => photo.isLoadingPreview)) {
      setErrors((prev) => ({
        ...prev,
        photos: 'Please wait until image loading completes before publishing.',
      }));
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Cozy Downtown Apartment"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {propertyTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Describe your property in detail. What makes it special? What can guests expect?"
                  />
                  <div className="mt-1 flex justify-between text-sm text-gray-500">
                    <span>{formData.description.length}/500 characters</span>
                    {errors.description && <span className="text-red-600">{errors.description}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City/Area *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Nairobi, Mombasa"
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Street address, building name, etc."
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="City name"
                    />
                    {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Availability</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Night (KSh) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={formData.pricePerNight}
                      onChange={(e) => handleInputChange('pricePerNight', parseInt(e.target.value) || '')}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.pricePerNight ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.pricePerNight && <p className="mt-1 text-sm text-red-600">{errors.pricePerNight}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit (KSh)
                  </label>
                  <input
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) => handleInputChange('securityDeposit', parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Nights
                    </label>
                    <input
                      type="number"
                      value={formData.minimumNights}
                      onChange={(e) => handleInputChange('minimumNights', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Nights
                    </label>
                    <input
                      type="number"
                      value={formData.maximumNights}
                      onChange={(e) => handleInputChange('maximumNights', parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => handleInputChange('checkInTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || '')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.bedrooms ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min="0"
                    />
                    {errors.bedrooms && <p className="mt-1 text-sm text-red-600">{errors.bedrooms}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bathrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || '')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.bathrooms ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min="0"
                      step="0.5"
                    />
                    {errors.bathrooms && <p className="mt-1 text-sm text-red-600">{errors.bathrooms}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Guests *
                    </label>
                    <input
                      type="number"
                      value={formData.guests}
                      onChange={(e) => handleInputChange('guests', parseInt(e.target.value) || '')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.guests ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                      min="1"
                    />
                    {errors.guests && <p className="mt-1 text-sm text-red-600">{errors.guests}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beds
                    </label>
                    <input
                      type="number"
                      value={formData.beds}
                      onChange={(e) => handleInputChange('beds', parseInt(e.target.value) || '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage (sq ft)
                  </label>
                  <input
                    type="number"
                    value={formData.squareFootage}
                    onChange={(e) => handleInputChange('squareFootage', parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <p className="text-sm text-gray-600 mb-6">Select all amenities that apply to your property</p>
              
              {Object.entries(amenityCategories).map(([category, amenities]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">{category}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {amenities.map(amenity => (
                      <label key={amenity} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.amenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
              <p className="text-sm text-gray-600 mb-6">Add high-quality photos of your property. You can add up to 20 photos.</p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload photos
                    </span>
                    <input
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG, WEBP, GIF, HEIC up to {MAX_PHOTO_SIZE_MB}MB each
                  </p>
                </div>
              </div>

              {photoUploadMessages.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {photoUploadMessages.map((message, index) => (
                    <p key={`${message}-${index}`}>{message}</p>
                  ))}
                </div>
              )}

              {errors.photos && (
                <p className="text-sm text-red-600">{errors.photos}</p>
              )}

              {formData.photos && formData.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                  {formData.photos.map((photo, index) => (
                    <div key={photo.id || index} className="relative group">
                      <img
                        src={photo.preview || (typeof photo === 'string' ? photo : '')}
                        alt={`Property view ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      {photo.isLoadingPreview && (
                        <div className="absolute inset-0 rounded-lg bg-black/55 flex flex-col items-center justify-center text-white">
                          <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin mb-2" />
                          <p className="text-xs font-semibold">{photo.localLoadProgress || 0}%</p>
                        </div>
                      )}
                      {photo.is_primary && (
                        <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                          Display
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryPhoto(photo.id)}
                        className="absolute bottom-2 left-2 bg-white text-gray-700 text-xs px-2 py-1 rounded border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={photo.isLoadingPreview}
                      >
                        Set Display
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(photo.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h3>
              <p className="text-sm text-gray-600 mb-6">Select the rules that apply to your property</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {houseRulesOptions.map(rule => (
                    <label key={rule} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.houseRules.includes(rule)}
                        onChange={() => handleRuleToggle(rule)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">{rule}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-800">Additional Policies</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.smokingAllowed}
                        onChange={(e) => handleInputChange('smokingAllowed', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">Smoking allowed</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.petsAllowed}
                        onChange={(e) => handleInputChange('petsAllowed', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">Pets allowed</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.partiesAllowed}
                        onChange={(e) => handleInputChange('partiesAllowed', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">Parties/events allowed</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.childrenAllowed}
                        onChange={(e) => handleInputChange('childrenAllowed', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">Children allowed</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Publish</h3>
              <p className="text-sm text-gray-600 mb-6">Review your listing details before publishing</p>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                {/* Overview & pricing */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-4 space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{formData.title || 'Untitled listing'}</h4>
                    <p className="text-sm text-gray-600">
                      {[formData.location, formData.city, formData.country].filter(Boolean).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">
                      {formData.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      KSh {formData.pricePerNight ? Number(formData.pricePerNight).toLocaleString() : '0'}
                    </p>
                    <p className="text-sm text-gray-500">per night</p>
                    {formData.securityDeposit && (
                      <p className="text-xs text-gray-500 mt-1">
                        Security deposit: KSh {Number(formData.securityDeposit).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Location</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium">
                        {formData.address || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">City & Country</p>
                      <p className="font-medium">
                        {[formData.city, formData.country].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Property details */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Property details</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Property Type</p>
                      <p className="font-medium">
                        {propertyTypes.find(t => t.value === formData.propertyType)?.label || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bedrooms</p>
                      <p className="font-medium">{formData.bedrooms || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bathrooms</p>
                      <p className="font-medium">{formData.bathrooms || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Max Guests</p>
                      <p className="font-medium">{formData.guests || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Beds</p>
                      <p className="font-medium">{formData.beds || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Square Footage (Optional)</p>
                      <p className="font-medium">
                        {formData.squareFootage ? `${formData.squareFootage} sq ft` : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stay rules & timing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Stay requirements</h4>
                    <p className="text-gray-600">
                      Minimum nights: <span className="font-medium">{formData.minimumNights}</span>
                    </p>
                    <p className="text-gray-600">
                      Maximum nights: <span className="font-medium">{formData.maximumNights}</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Check-in / Check-out</h4>
                    <p className="text-gray-600">
                      Check-in: <span className="font-medium">{formData.checkInTime}</span>
                    </p>
                    <p className="text-gray-600">
                      Check-out: <span className="font-medium">{formData.checkOutTime}</span>
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    Amenities ({formData.amenities.length})
                  </h4>
                  {formData.amenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.amenities.map(amenity => (
                        <span
                          key={amenity}
                          className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No amenities selected</p>
                  )}
                </div>

                {/* House rules */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">House rules & policies</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {formData.houseRules.length > 0 ? (
                        formData.houseRules.map(rule => (
                          <span
                            key={rule}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {rule}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">No specific house rules selected</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <p className="text-gray-600">
                        Smoking:{' '}
                        <span className="font-medium">
                          {formData.smokingAllowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </p>
                      <p className="text-gray-600">
                        Pets:{' '}
                        <span className="font-medium">
                          {formData.petsAllowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </p>
                      <p className="text-gray-600">
                        Parties:{' '}
                        <span className="font-medium">
                          {formData.partiesAllowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </p>
                      <p className="text-gray-600">
                        Children:{' '}
                        <span className="font-medium">
                          {formData.childrenAllowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Photos</h4>
                  {formData.photos && formData.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden">
                          <img
                            src={typeof photo === 'string' ? photo : photo.preview || ''}
                            alt={`Listing view ${index + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          {photo.is_primary && (
                            <span className="absolute top-1 left-1 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                              Display
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No photos added yet. Go back to the Photos step to upload images.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {editingListing ? 'Edit BnB Listing' : 'Add New BnB Listing'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= step.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  currentStep > step.id ? 'bg-primary-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          {steps.map(step => (
            <span key={step.id} className="text-center">
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Previous
        </button>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  {editingListing ? 'Update Listing' : 'Publish Listing'}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentStep === 6 && formData.photos.some((photo) => photo.isLoadingPreview)}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center"
            >
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveBnBForm;
