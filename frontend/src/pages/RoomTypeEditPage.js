import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listingsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeftIcon,
  PhotoIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const RoomTypeEditPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hotelId = searchParams.get('hotelId'); // Get hotel ID from query params if provided
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const errorMessageRef = useRef(null);
  const loadingRef = useRef(false); // Prevent multiple simultaneous loads
  
  const [roomType, setRoomType] = useState({
    id: null,
    name: '',
    description: '',
    category: 'standard',
    bed_type: 'single',
    max_adults: 2,
    max_children: 1,
    base_price: '',
    currency: 'KES',
    bed_count: 1,
    max_occupancy: 2,
    is_available: true,
    has_balcony: false,
    has_kitchen: false,
    has_living_room: false,
    has_dining_area: false,
    has_sea_view: false,
    has_city_view: false,
    has_garden_view: false,
    has_bathtub: false,
    has_shower: true,
    has_workspace: false,
    is_active: true,
    short_description: '',
    images: [],
    amenities: [],
    hotel: null,
    hotel_name: ''
  });

  const returnToManageRooms = (state = {}) => {
    const targetHotelId = Number(roomType.hotel || hotelId || 0);
    navigate('/host-dashboard', {
      state: {
        initialTab: 'rooms',
        selectedHotelForRooms: targetHotelId || null,
        ...state,
      },
    });
  };

  // Load room type data
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      return;
    }
    
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }
    
    const loadRoomType = async () => {
      loadingRef.current = true;
      try {
        setLoading(true);
        setError('');
        
        // Fetch room type directly using the detail endpoint (includes full images)
        const room = await listingsAPI.getRoomType(parseInt(id));
        
        if (!room) {
          setError('Room type not found. It may have been deleted or you may not have permission to edit it.');
          return;
        }
        
        console.log('Room loaded:', { id: room.id, name: room.name, imagesCount: room.images?.length });
        
        // Get hotel info - only fetch if we don't have hotelId or need to verify
        let hotel = null;
        const roomHotelId = typeof room.hotel === 'object' ? room.hotel.id : room.hotel;
        
        if (hotelId && parseInt(hotelId) === roomHotelId) {
          // We have hotelId in URL and it matches, fetch hotel info
          const hotelsResponse = await listingsAPI.getUserListings();
          const allHotels = hotelsResponse?.results || hotelsResponse || [];
          hotel = allHotels.find(h => h.id === parseInt(hotelId));
        } else if (roomHotelId) {
          // Use hotel from room data
          const hotelsResponse = await listingsAPI.getUserListings();
          const allHotels = hotelsResponse?.results || hotelsResponse || [];
          hotel = allHotels.find(h => h.id === roomHotelId);
        }
        
        if (!hotel) {
          setError('Hotel not found for this room type.');
          return;
        }
        
        // Map images properly - backend returns {id, image (URL), image_type, caption, is_primary, order}
        const mappedImages = (room.images || []).map((img) => {
          let imageUrl = img.image || (typeof img === 'string' ? img : img.url || null);
          
          // If the URL is relative, make it absolute by prepending the backend URL
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
            const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const baseUrl = backendUrl.replace(/\/api\/v1\/?$/, '');
            imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
          }
          
          return {
            id: img.id,
            url: imageUrl,
            image_type: img.image_type || 'main',
            caption: img.caption || '',
            is_primary: img.is_primary || false,
            order: img.order || 0
          };
        }).filter(img => img.url); // Filter out any images without URLs
        
        setRoomType({
          id: room.id,
          name: room.name || '',
          description: room.description || '',
          short_description: room.short_description || '',
          category: room.category || 'standard',
          bed_type: room.bed_type || 'single',
          max_adults: room.max_adults || room.max_occupancy || 2,
          max_children: room.max_children || 1,
          base_price: room.base_price || '',
          currency: room.currency || 'KES',
          bed_count: room.bed_count || 1,
          max_occupancy: room.max_occupancy || room.max_adults || 2,
          is_available: room.is_available !== false,
          is_active: room.is_active !== false,
          has_balcony: room.has_balcony || false,
          has_kitchen: room.has_kitchen || false,
          has_living_room: room.has_living_room || false,
          has_dining_area: room.has_dining_area || false,
          has_sea_view: room.has_sea_view || false,
          has_city_view: room.has_city_view || false,
          has_garden_view: room.has_garden_view || false,
          has_bathtub: room.has_bathtub || false,
          has_shower: room.has_shower !== false,
          has_workspace: room.has_workspace || false,
          images: mappedImages,
          amenities: room.amenities || room.amenity_mappings?.map(m => m.amenity?.id || m.amenity) || [],
          hotel: hotel.id,
          hotel_name: hotel.name || ''
        });
      } catch (err) {
        console.error('Error loading room type:', err);
        setError('Failed to load room type. Please try again.');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadRoomType();
    
    // Cleanup function to reset loading flag if component unmounts
    return () => {
      loadingRef.current = false;
    };
  }, [id, user?.id, hotelId]);

  const handleInputChange = (field, value) => {
    setRoomType(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // Create preview URLs for immediate display, but keep File objects for upload
    const previewImages = files.map((file, index) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file: file, // Keep file reference for upload
      image_type: 'main',
      caption: '',
      is_primary: roomType.images.length === 0 && index === 0, // First image is primary if no images exist
      order: roomType.images.length + index,
      isNew: true // Flag to indicate this needs to be uploaded
    }));
    
    setRoomType(prev => ({
      ...prev,
      images: [...prev.images, ...previewImages]
    }));
  };

  const handleRemoveImage = (index) => {
    setRoomType(prev => {
      const imageToRemove = prev.images[index];
      
      // Clean up object URL if it's a preview
      if (imageToRemove?.isNew && imageToRemove?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      
      return {
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!roomType.name || !roomType.base_price || !roomType.category) {
        setError('Please fill in all required fields (Name, Category, and Base Price are required)');
        setSaving(false);
        return;
      }

      // Validate base price is a valid number
      const basePriceNum = parseFloat(roomType.base_price);
      if (isNaN(basePriceNum) || basePriceNum <= 0) {
        setError('Base price must be a valid number greater than 0');
        setSaving(false);
        return;
      }

      console.log('💾 Saving room type:', { id: roomType.id, hotel: roomType.hotel, name: roomType.name });

      // Prepare update payload
      const updatePayload = {
        name: roomType.name.trim(),
        description: roomType.description?.trim() || '',
        short_description: roomType.short_description?.trim() || '',
        category: roomType.category,
        bed_type: roomType.bed_type,
        max_adults: parseInt(roomType.max_adults || roomType.max_occupancy || 2),
        max_children: parseInt(roomType.max_children || 0),
        base_price: basePriceNum,
        currency: roomType.currency,
        bed_count: parseInt(roomType.bed_count || 1),
        max_occupancy: parseInt(roomType.max_occupancy || roomType.max_adults || 2),
        is_available: roomType.is_available !== false,
        is_active: roomType.is_active !== false,
        has_balcony: roomType.has_balcony || false,
        has_kitchen: roomType.has_kitchen || false,
        has_living_room: roomType.has_living_room || false,
        has_dining_area: roomType.has_dining_area || false,
        has_sea_view: roomType.has_sea_view || false,
        has_city_view: roomType.has_city_view || false,
        has_garden_view: roomType.has_garden_view || false,
        has_bathtub: roomType.has_bathtub || false,
        has_shower: roomType.has_shower !== false,
        has_workspace: roomType.has_workspace || false
      };

      // Don't include hotel_id for updates - room type already belongs to a hotel
      // The backend will reject hotel_id changes anyway

      console.log('📤 Sending update payload:', updatePayload);

      // Update room type via API
      const updatedRoomType = await listingsAPI.updateRoomType(roomType.id, updatePayload);

      console.log('✅ Room type updated successfully:', updatedRoomType);

      // Upload any new images that were added
      const imagesToUpload = roomType.images?.filter(img => img.isNew && img.file) || [];
      
      if (imagesToUpload.length > 0 && roomType.id) {
        console.log(`Uploading ${imagesToUpload.length} new images for room type ${roomType.id}`);
        
        try {
          const uploadPromises = imagesToUpload.map(async (img, index) => {
            try {
              await listingsAPI.uploadRoomImage(roomType.id, {
                file: img.file,
                image_type: img.image_type || 'main',
                caption: img.caption || '',
                is_primary: img.is_primary || (index === 0 && !roomType.images.some(i => i.is_primary && !i.isNew)),
                order: img.order !== undefined ? img.order : (roomType.images.length - imagesToUpload.length + index)
              });
              console.log(`Image ${index + 1} uploaded successfully`);
            } catch (imgError) {
              console.error(`Failed to upload image ${index + 1}:`, imgError);
            }
          });
          
          await Promise.all(uploadPromises);
          console.log('All images uploaded successfully');
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          // Don't fail the entire save if image upload fails, but show a warning
          setError(prev => prev ? `${prev}. Some images may not have uploaded.` : 'Room type saved but some images failed to upload.');
        }
      }

      setSuccess('Room type updated successfully! Returning you to Manage Rooms so you can continue with the next room type.');
      setSaving(false);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Wait a moment for user to see success message, then redirect
      setTimeout(() => {
        returnToManageRooms({
          successMessage: 'Room type saved. You can continue with the next room type below.',
          recentlySavedRoomId: roomType.id,
        });
      }, 2000);
    } catch (err) {
      console.error('❌ Error updating room type:', err);
      console.error('Error details:', {
        message: err?.message,
        response: err?.response,
        data: err?.response?.data,
        status: err?.response?.status
      });
      
      // Extract error message from various possible error formats
      let errorMessage = 'Failed to update room type. Please try again.';
      
      if (err?.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          // Check for field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setSaving(false);
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (errorMessageRef.current) {
        errorMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading room type...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => returnToManageRooms()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Room Type</h1>
          {roomType.hotel_name && (
            <p className="text-gray-600 mt-2">Hotel: {roomType.hotel_name}</p>
          )}
        </div>

        {/* Error/Success Messages - Scroll to top when visible */}
        {(error || success) && (
          <div ref={errorMessageRef} className="mb-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start shadow-md"
              >
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">{error}</p>
                  <button
                    onClick={() => setError('')}
                    className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border-2 border-green-300 rounded-lg p-4 flex items-start shadow-md"
              >
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-8">
            {/* Basic Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Room Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomType.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Standard Double Room"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roomType.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                    <option value="presidential">Presidential</option>
                    <option value="family">Family</option>
                    <option value="executive">Executive</option>
                    <option value="studio">Studio</option>
                    <option value="penthouse">Penthouse</option>
                  </select>
                </div>

                {/* Bed Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roomType.bed_type}
                    onChange={(e) => handleInputChange('bed_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="queen">Queen</option>
                    <option value="king">King</option>
                    <option value="twin">Twin</option>
                  </select>
                </div>

                {/* Bed Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Beds
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={roomType.bed_count}
                    onChange={(e) => handleInputChange('bed_count', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Max Adults */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Adults <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={roomType.max_adults}
                    onChange={(e) => handleInputChange('max_adults', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Max Children */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={roomType.max_children}
                    onChange={(e) => handleInputChange('max_children', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Max Occupancy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Occupancy
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={roomType.max_occupancy}
                    onChange={(e) => handleInputChange('max_occupancy', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <input
                  type="text"
                  value={roomType.short_description || ''}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description (max 500 characters)"
                  maxLength={500}
                />
              </div>

              {/* Full Description */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description
                </label>
                <textarea
                  value={roomType.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the room type, its features, and what makes it special..."
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price per Night <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <select
                      value={roomType.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="border border-gray-300 rounded-l-lg px-4 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={roomType.base_price}
                      onChange={(e) => handleInputChange('base_price', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-r-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Room Features Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'has_balcony', label: 'Balcony' },
                  { key: 'has_kitchen', label: 'Kitchen' },
                  { key: 'has_living_room', label: 'Living Room' },
                  { key: 'has_dining_area', label: 'Dining Area' },
                  { key: 'has_sea_view', label: 'Sea View' },
                  { key: 'has_city_view', label: 'City View' },
                  { key: 'has_garden_view', label: 'Garden View' },
                  { key: 'has_bathtub', label: 'Bathtub' },
                  { key: 'has_shower', label: 'Shower' },
                  { key: 'has_workspace', label: 'Workspace' }
                ].map((feature) => (
                  <label key={feature.key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roomType[feature.key] !== undefined ? roomType[feature.key] : (feature.key === 'has_shower' ? true : false)}
                      onChange={(e) => handleInputChange(feature.key, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Images</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {roomType.images && roomType.images.length > 0 ? (
                  roomType.images.map((image, index) => {
                    // Handle different image formats: object with url/image field, or string URL
                    const imageUrl = image?.url || image?.image || (typeof image === 'string' ? image : null);
                    const imageId = image?.id || `temp-${index}`;
                    
                    if (!imageUrl) return null;
                    
                    return (
                      <div key={imageId || index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={image?.caption || `Room image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            console.error('Failed to load image:', imageUrl);
                            e.target.style.display = 'none';
                          }}
                        />
                        {image?.is_primary && (
                          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        {image?.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {image.caption}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-4">
                    No images uploaded yet
                  </div>
                )}
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <PhotoIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Add Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Availability & Status Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Availability & Status</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomType.is_available !== false}
                    onChange={(e) => handleInputChange('is_available', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for booking</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomType.is_active !== false}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (visible to guests)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-6 flex justify-end space-x-4">
              <button
                onClick={() => returnToManageRooms()}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('💾 Save button clicked!', { 
                    roomTypeId: roomType.id, 
                    saving,
                    roomTypeName: roomType.name,
                    basePrice: roomType.base_price,
                    category: roomType.category
                  });
                  if (!roomType.id) {
                    setError('Room type ID is missing. Please refresh the page and try again.');
                    return;
                  }
                  handleSave();
                }}
                disabled={saving || !roomType.id}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomTypeEditPage;
