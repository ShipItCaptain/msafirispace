import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BookingDetailModal from './BookingDetailModal';
import { listingsAPI } from '../../services/api';
import {
  CheckCircleIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const HostDashboardModals = ({
  showAddHotelModal,
  setShowAddHotelModal,
  currentStep,
  setCurrentStep,
  resetForm,
  newHotelData,
  setNewHotelData,
  nextStep,
  prevStep,
  canProceedToReview,
  validateAllRequiredFields,
  handleAddHotel,
  error,
  stepWarning,
  setError,
  setSuccess,
  showEditHotelModal,
  selectedHotel,
  setSelectedHotel,
  setShowEditHotelModal,
  loadDashboardData,
  selectedRoomType,
  setSelectedRoomType,
  initializeRoomConfigurationState,
  roomAmenities,
  setRoomAmenities,
  roomFeatures,
  setRoomFeatures,
  roomAvailability,
  setRoomAvailability,
  handleSaveRoomConfiguration,
  setAllRoomTypes,
  allRoomTypes,
  showEditRoomModal,
  setShowEditRoomModal,
  editingRoomType,
  setEditingRoomType,
  selectedBooking,
  setSelectedBooking,
  formatCurrency,
  getStatusColor,
  bookingActivityLog,
  timeAgo,
  bookingActionLoadingId,
  handleBookingStatusUpdate,
  hotelToDelete,
  isDeletingHotel,
  handleDeleteHotel,
  setHotelToDelete,
  bookings
}) => {
  const [isUpdatingHotel, setIsUpdatingHotel] = useState(false);
  const hotelFormSteps = [
    { number: 1, label: 'Basic Info' },
    { number: 2, label: 'Location' },
    { number: 3, label: 'Amenities' },
    { number: 4, label: 'Rooms' },
    { number: 5, label: 'Review' },
  ];

  const releaseHotelImagePreviews = () => {
    (newHotelData.images || []).forEach((img) => {
      if (img && typeof img === 'object' && img.preview) {
        try { URL.revokeObjectURL(img.preview); } catch (_) {}
      }
    });
  };

  useEffect(() => {
    if (!showAddHotelModal) {
      releaseHotelImagePreviews();
    }
  }, [showAddHotelModal]);

  const handleHotelImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const hasPrimary = (newHotelData.images || []).some((img) => img?.is_primary);
    const newImages = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      is_primary: !hasPrimary && index === 0,
      image_type: 'exterior',
      caption: ''
    }));
    setNewHotelData({
      ...newHotelData,
      images: [...(newHotelData.images || []), ...newImages]
    });
    event.target.value = '';
  };

  const removeHotelImage = (index) => {
    const images = [...(newHotelData.images || [])];
    const [removed] = images.splice(index, 1);
    if (removed?.preview) {
      try { URL.revokeObjectURL(removed.preview); } catch (_) {}
    }
    if (!images.some((img) => img?.is_primary) && images.length) {
      images[0] = { ...images[0], is_primary: true };
    }
    setNewHotelData({ ...newHotelData, images });
  };

  const setPrimaryHotelImage = (index) => {
    const images = (newHotelData.images || []).map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setNewHotelData({ ...newHotelData, images });
  };

  const getHotelImageSrc = (image) => (
    typeof image === 'string' ? image : (image?.preview || image?.url || '')
  );

  const isStepComplete = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return Boolean(newHotelData.name?.trim() && newHotelData.description?.trim());
      case 2:
        return Boolean(newHotelData.address?.trim() && newHotelData.city?.trim());
      case 3:
        return Boolean((newHotelData.amenities || []).length > 0 || (newHotelData.images || []).length > 0);
      case 4:
        return (newHotelData.room_types || []).some((room) => (
          room.name?.trim() &&
          room.description?.trim() &&
          Number(room.base_price) > 0
        ));
      case 5:
        return validateAllRequiredFields().isValid;
      default:
        return false;
    }
  };

  return (
  <>
      {/* Enhanced Add Hotel Modal */}
      {showAddHotelModal && (
        <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-4" data-testid="host-add-hotel-modal">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Add New Hotel</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Step {currentStep} of 5: {hotelFormSteps.find((step) => step.number === currentStep)?.label}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowAddHotelModal(false);
                    releaseHotelImagePreviews();
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-8 py-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-center">
                {hotelFormSteps.map((step) => (
                  <div key={step.number} className="flex items-center">
                    {(() => {
                      const stepComplete = isStepComplete(step.number);
                      const isVisitedStep = step.number <= currentStep;

                      return (
                    <button
                      type="button"
                      onClick={() => {
                        if (step.number > currentStep) return;
                        setError('');
                        setCurrentStep(step.number);
                      }}
                      disabled={step.number > currentStep}
                      className={`group flex flex-col items-center transition-all duration-200 ${
                        step.number > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      aria-label={`Go to step ${step.number}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        stepComplete
                          ? 'bg-emerald-600 text-white'
                          : isVisitedStep
                            ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}>
                        {stepComplete ? <CheckCircleIcon className="h-4 w-4" /> : step.number}
                      </span>
                      <span className={`mt-2 text-[11px] font-medium ${
                        isVisitedStep ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                      <span className={`mt-1 text-[10px] ${
                        stepComplete ? 'text-emerald-600 font-medium' : 'text-gray-400'
                      }`}>
                        {stepComplete ? 'Saved' : 'In progress'}
                      </span>
                    >
                    </button>
                      );
                    })()}
                    {step.number < hotelFormSteps.length && (
                      <div className={`w-10 h-0.5 mx-2 -mt-5 transition-all duration-200 ${
                        isStepComplete(step.number) ? 'bg-emerald-600' : step.number < currentStep ? 'bg-red-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="px-8 py-6 flex-1 overflow-y-auto" data-testid={`host-hotel-step-${currentStep}`}>
              {stepWarning && currentStep < 5 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  {stepWarning}
                </div>
              )}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-1">Basic Information</h4>
                    <p className="text-gray-500 text-sm">Tell us about your hotel</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                    <input
                      type="text"
                      value={newHotelData.name}
                      onChange={(e) => setNewHotelData({...newHotelData, name: e.target.value})}
                      data-testid="host-hotel-name-input"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                      placeholder="Enter your hotel name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <select
                      value={newHotelData.property_type}
                      onChange={(e) => setNewHotelData({...newHotelData, property_type: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="hotel">Hotel</option>
                      <option value="resort">Resort</option>
                      <option value="boutique">Boutique Hotel</option>
                      <option value="lodge">Lodge</option>
                      <option value="guesthouse">Guesthouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Star Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewHotelData({...newHotelData, star_rating: star})}
                          data-testid={`host-hotel-star-${star}`}
                          className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                            star <= newHotelData.star_rating
                              ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                              : 'border-gray-300 text-gray-400'
                          }`}
                        >
                          <StarIcon className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      value={newHotelData.description}
                      onChange={(e) => setNewHotelData({...newHotelData, description: e.target.value})}
                      data-testid="host-hotel-description-input"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      placeholder="Describe your hotel, its unique features, and what makes it special..."
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Location & Contact</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <input
                      type="text"
                      value={newHotelData.address}
                      onChange={(e) => setNewHotelData({...newHotelData, address: e.target.value})}
                      data-testid="host-hotel-address-input"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      value={newHotelData.city}
                      onChange={(e) => setNewHotelData({...newHotelData, city: e.target.value})}
                      data-testid="host-hotel-city-input"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="City"
                    />
                  </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <select
                      value={newHotelData.country}
                      onChange={(e) => setNewHotelData({...newHotelData, country: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Kenya">Kenya</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="Ethiopia">Ethiopia</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                      <input
                        type="time"
                        value={newHotelData.check_in_time}
                        onChange={(e) => setNewHotelData({...newHotelData, check_in_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                      <input
                        type="time"
                        value={newHotelData.check_out_time}
                        onChange={(e) => setNewHotelData({...newHotelData, check_out_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Nights</label>
                      <input
                        type="number"
                        min="1"
                        value={newHotelData.maximum_nights || 30}
                        onChange={(e) => setNewHotelData({...newHotelData, maximum_nights: parseInt(e.target.value) || 30})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                      type="tel"
                      value={newHotelData.phone}
                      onChange={(e) => setNewHotelData({...newHotelData, phone: e.target.value})}
                      data-testid="host-hotel-phone-input"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+254 700 000 000"
                    />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newHotelData.email}
                      onChange={(e) => setNewHotelData({...newHotelData, email: e.target.value})}
                      data-testid="host-hotel-email-input"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="hotel@example.com"
                    />
                  </div>
                  </div>

                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Amenities & Services</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      'Wi-Fi', 'Parking', 'Pool', 'Spa', 'Gym', 'Restaurant',
                      'Bar', 'Room Service', 'Laundry', 'Airport Shuttle',
                      'Business Center', 'Meeting Rooms', 'Pet Friendly', 'Smoking Allowed'
                    ].map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newHotelData.amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewHotelData({
                                ...newHotelData,
                                amenities: [...newHotelData.amenities, amenity]
                              });
                            } else {
                              setNewHotelData({
                                ...newHotelData,
                                amenities: newHotelData.amenities.filter(a => a !== amenity)
                              });
                            }
                          }}
                          data-testid={`host-hotel-amenity-${amenity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Hotel Images</h5>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Upload hotel images</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        id="host-hotel-images"
                        onChange={handleHotelImageUpload}
                        data-testid="host-hotel-images-input"
                      />
                      <label
                        htmlFor="host-hotel-images"
                        className="mt-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm"
                      >
                        Choose Images
                      </label>
                    </div>

                    {newHotelData.images && newHotelData.images.length > 0 && (
                      <div
                        className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3"
                        data-testid="host-hotel-images-preview-grid"
                      >
                        {newHotelData.images.map((image, index) => (
                          <div key={`${index}`} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={getHotelImageSrc(image)}
                              alt={`Hotel image ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPrimaryHotelImage(index)}
                                className="text-xs px-2 py-1 bg-white rounded"
                              >
                                {image?.is_primary ? 'Primary' : 'Set Primary'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeHotelImage(index)}
                                className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Room Types & Pricing</h4>
                  
                  {newHotelData.room_types.map((room, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h5 className="font-medium text-gray-900">Room Type {index + 1}</h5>
                        {newHotelData.room_types.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedRooms = newHotelData.room_types.filter((_, i) => i !== index);
                              setNewHotelData({...newHotelData, room_types: updatedRooms});
                            }}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Room Name *</label>
                            <input
                              type="text"
                              value={room.name}
                              onChange={(e) => {
                                const updatedRooms = [...newHotelData.room_types];
                                    updatedRooms[index].name = e.target.value;
                                    setNewHotelData({...newHotelData, room_types: updatedRooms});
                                  }}
                              data-testid={`host-room-name-${index}`}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Deluxe Double Room"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Room Category</label>
                            <select
                              value={room.category}
                              onChange={(e) => {
                                const updatedRooms = [...newHotelData.room_types];
                                updatedRooms[index].category = e.target.value;
                                setNewHotelData({...newHotelData, room_types: updatedRooms});
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="standard">Standard</option>
                              <option value="deluxe">Deluxe</option>
                              <option value="suite">Suite</option>
                              <option value="presidential">Presidential</option>
                              <option value="family">Family</option>
                              <option value="executive">Executive</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bed Type</label>
                            <select
                              value={room.bed_type}
                              onChange={(e) => {
                                const updatedRooms = [...newHotelData.room_types];
                                updatedRooms[index].bed_type = e.target.value;
                                setNewHotelData({...newHotelData, room_types: updatedRooms});
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="single">Single Bed</option>
                              <option value="double">Double Bed</option>
                              <option value="queen">Queen Bed</option>
                              <option value="king">King Bed</option>
                              <option value="twin">Twin Beds</option>
                              <option value="bunk">Bunk Beds</option>
                            </select>
                          </div>

                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Occupancy</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Adults</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={room.max_adults}
                                  onChange={(e) => {
                                    const updatedRooms = [...newHotelData.room_types];
                                    updatedRooms[index].max_adults = parseInt(e.target.value) || 1;
                                    setNewHotelData({...newHotelData, room_types: updatedRooms});
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Children</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={room.max_children}
                                  onChange={(e) => {
                                    const updatedRooms = [...newHotelData.room_types];
                                    updatedRooms[index].max_children = parseInt(e.target.value) || 0;
                                    setNewHotelData({...newHotelData, room_types: updatedRooms});
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Currency</label>
                                <select
                                  value={room.currency || 'USD'}
                                  onChange={(e) => {
                                    const updatedRooms = [...newHotelData.room_types];
                                    updatedRooms[index].currency = e.target.value;
                                    setNewHotelData({...newHotelData, room_types: updatedRooms});
                                  }}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="USD">USD ($)</option>
                                  <option value="KES">KES (Ksh)</option>
                                  <option value="EUR">EUR (€)</option>
                                  <option value="GBP">GBP (£)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Price per Night</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={room.base_price}
                              onChange={(e) => {
                                const updatedRooms = [...newHotelData.room_types];
                                updatedRooms[index].base_price = parseFloat(e.target.value) || 0;
                                setNewHotelData({...newHotelData, room_types: updatedRooms});
                              }}
                              data-testid={`host-room-price-${index}`}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Room Description *</label>
                            <textarea
                              value={room.description}
                              onChange={(e) => {
                                const updatedRooms = [...newHotelData.room_types];
                                updatedRooms[index].description = e.target.value;
                                setNewHotelData({...newHotelData, room_types: updatedRooms});
                              }}
                              data-testid={`host-room-description-${index}`}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Describe this room type, its features, amenities, and what makes it special..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Note about detailed configuration */}
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Detailed Configuration Available Later
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>After creating your hotel, you'll be able to add images, amenities, features, and availability settings for each room type in the hotel management section.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setNewHotelData({
                        ...newHotelData,
                        room_types: [...newHotelData.room_types, {
                          name: '',
                          description: '',
                          category: 'standard',
                          bed_type: 'double',
                          max_adults: 2,
                          max_children: 1,
                          base_price: 0,
                          currency: 'USD',
                          images: []
                        }]
                      });
                    }}
                    data-testid="host-add-room-type-button"
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <PlusIcon className="h-6 w-6 mx-auto mb-2" />
                    Add Another Room Type
                  </button>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Review & Submit</h4>
                  <p className="text-gray-600 text-sm">Please review all your information before submitting your hotel listing.</p>
                  
                  {/* Validation Status */}
                  {(() => {
                    const validation = validateAllRequiredFields();
                    if (!validation.isValid) {
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                Please complete the following required fields:
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc list-inside space-y-1">
                                  {validation.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">
                                All required information is complete!
                              </h3>
                              <p className="mt-1 text-sm text-green-700">
                                You can now submit your hotel listing.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                  
                  {/* Basic Information Review */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                      Basic Information
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Hotel Name:</span>
                        <p className="text-gray-900">{newHotelData.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Property Type:</span>
                        <p className="text-gray-900 capitalize">{newHotelData.property_type || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Star Rating:</span>
                        <p className="text-gray-900">{newHotelData.star_rating ? '⭐'.repeat(newHotelData.star_rating) + ` (${newHotelData.star_rating} stars)` : 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Description:</span>
                        <p className="text-gray-900">{newHotelData.description || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location Information Review */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                      Location & Contact
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Address:</span>
                        <p className="text-gray-900">{newHotelData.address || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">City:</span>
                        <p className="text-gray-900">{newHotelData.city || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Country:</span>
                        <p className="text-gray-900">{newHotelData.country || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-900">{newHotelData.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{newHotelData.email || 'Not provided'}</p>
                      </div>
                      {(newHotelData.latitude && newHotelData.longitude) && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Coordinates:</span>
                          <p className="text-gray-900">{newHotelData.latitude}, {newHotelData.longitude}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amenities Review */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                      Hotel Amenities
                    </h5>
                    {newHotelData.amenities && newHotelData.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {newHotelData.amenities.map((amenity, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No amenities selected</p>
                    )}
                  </div>

                  {/* Room Types Review */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                      Room Types & Pricing
                    </h5>
                    <div className="space-y-4">
                      {newHotelData.room_types && newHotelData.room_types.map((room, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <h6 className="font-medium text-gray-900">{room.name || `Room Type ${index + 1}`}</h6>
                            <span className="text-sm text-gray-500">{room.category}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="font-medium text-gray-700">Bed Type:</span>
                              <p className="text-gray-900 capitalize">{room.bed_type}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Max Occupancy:</span>
                              <p className="text-gray-900">{room.max_adults} adults, {room.max_children} children</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Price:</span>
                              <p className="text-gray-900 font-semibold">{room.currency} {room.base_price}/night</p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">Description:</span>
                              <p className="text-gray-900">{room.description || 'No description provided'}</p>
                            </div>
                          </div>

                          {/* Note about detailed configuration */}
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                <svg className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-2">
                                <p className="text-xs text-blue-700">
                                  Images, amenities, features, and availability settings can be configured after hotel creation.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotel Images Review */}
                  {newHotelData.images && newHotelData.images.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">5</span>
                        Hotel Images
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="host-hotel-images-review-grid">
                        {newHotelData.images.map((image, index) => (
                          <img
                            key={index}
                            src={getHotelImageSrc(image)}
                            alt={`Hotel view ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Policies Review */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">6</span>
                      Policies
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Maximum Nights:</span>
                        <p className="text-gray-900">{newHotelData.maximum_nights || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Check-in Time:</span>
                        <p className="text-gray-900">{newHotelData.check_in_time || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Check-out Time:</span>
                        <p className="text-gray-900">{newHotelData.check_out_time || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cancellation Policy:</span>
                        <p className="text-gray-900 capitalize">{newHotelData.cancellation_policy || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Pet Policy:</span>
                        <p className="text-gray-900">{newHotelData.policies?.pets_allowed ? 'Pets allowed' : 'Pets not allowed'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Ready to publish!</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>After clicking "Add Hotel", you'll be taken to configure your room types with images, amenities, and availability settings. Your hotel will be reviewed and published within 24 hours.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Always Visible */}
            <div className="flex justify-between items-center px-8 py-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  if (currentStep === 1) {
                    setShowAddHotelModal(false);
                    releaseHotelImagePreviews();
                    resetForm();
                    return;
                  }
                  prevStep();
                }}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {currentStep > 1 && (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                )}
                {currentStep === 1 ? 'Close' : 'Back'}
              </button>
              
              <div className="flex space-x-3">
                {currentStep < 5 ? (
                  <button
                    onClick={nextStep}
                    data-testid="host-hotel-continue-button"
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleAddHotel}
                    disabled={!canProceedToReview()}
                    data-testid="host-hotel-submit-button"
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Hotel & Configure Rooms
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Hotel Modal */}
      {showEditHotelModal && selectedHotel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (isUpdatingHotel) return;
            setShowEditHotelModal(false);
            setSelectedHotel(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-hotel-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h3 id="edit-hotel-title" className="text-lg font-semibold text-gray-900">
                  Edit hotel
                </h3>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {selectedHotel.name || 'Update property details guests see'}
                </p>
              </div>
              <button
                type="button"
                disabled={isUpdatingHotel}
                onClick={() => {
                  setShowEditHotelModal(false);
                  setSelectedHotel(null);
                }}
                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              <section className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basics</p>
                  <p className="mt-0.5 text-sm text-gray-500">Name, story, and star rating</p>
                </div>

                <div>
                  <label htmlFor="edit-hotel-name" className="mb-1.5 block text-sm font-medium text-gray-900">
                    Hotel name
                  </label>
                  <input
                    id="edit-hotel-name"
                    type="text"
                    value={selectedHotel.name || ''}
                    onChange={(e) => setSelectedHotel({ ...selectedHotel, name: e.target.value })}
                    className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="e.g. Acacia Resort"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <label htmlFor="edit-hotel-description" className="block text-sm font-medium text-gray-900">
                      Description
                    </label>
                    <span className="text-xs text-gray-400">
                      {(selectedHotel.description || '').length}/500
                    </span>
                  </div>
                  <textarea
                    id="edit-hotel-description"
                    value={selectedHotel.description || ''}
                    onChange={(e) =>
                      setSelectedHotel({
                        ...selectedHotel,
                        description: e.target.value.slice(0, 500),
                      })
                    }
                    rows={4}
                    className="w-full resize-y border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="What makes this stay special?"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">Star rating</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((stars) => {
                      const selected = Number(selectedHotel.star_rating || 0) === stars;
                      return (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setSelectedHotel({ ...selectedHotel, star_rating: stars })}
                          className={`inline-flex items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <StarIcon className={`h-4 w-4 ${selected ? 'text-red-600' : 'text-gray-400'}`} />
                          {stars}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                  <p className="mt-0.5 text-sm text-gray-500">Where guests will find you</p>
                </div>

                <div>
                  <label htmlFor="edit-hotel-city" className="mb-1.5 block text-sm font-medium text-gray-900">
                    City
                  </label>
                  <input
                    id="edit-hotel-city"
                    type="text"
                    value={selectedHotel.city || ''}
                    onChange={(e) => setSelectedHotel({ ...selectedHotel, city: e.target.value })}
                    className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label htmlFor="edit-hotel-address" className="mb-1.5 block text-sm font-medium text-gray-900">
                    Address
                  </label>
                  <input
                    id="edit-hotel-address"
                    type="text"
                    value={selectedHotel.address || ''}
                    onChange={(e) => setSelectedHotel({ ...selectedHotel, address: e.target.value })}
                    className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="Street, ward, or landmark"
                  />
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={isUpdatingHotel}
                onClick={() => {
                  setShowEditHotelModal(false);
                  setSelectedHotel(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingHotel || !(selectedHotel.name || '').trim()}
                onClick={async () => {
                  setIsUpdatingHotel(true);
                  setError('');
                  try {
                    await listingsAPI.updateListing(selectedHotel.id, selectedHotel);
                    setSuccess('Hotel updated successfully!');
                    setShowEditHotelModal(false);
                    setSelectedHotel(null);
                    await loadDashboardData();
                  } catch (err) {
                    setError('Failed to update hotel. Please try again.');
                  } finally {
                    setIsUpdatingHotel(false);
                  }
                }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdatingHotel ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Type Modal */}
      {showEditRoomModal && editingRoomType && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Edit Room Type</h3>
                  <button
                    onClick={() => setShowEditRoomModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Room Type Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                    <input
                      type="text"
                      value={editingRoomType.name}
                      onChange={(e) => setEditingRoomType({...editingRoomType, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={editingRoomType.category}
                      onChange={(e) => setEditingRoomType({...editingRoomType, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (KES)</label>
                    <input
                      type="number"
                      value={editingRoomType.base_price}
                      onChange={(e) => setEditingRoomType({...editingRoomType, base_price: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Occupancy</label>
                    <input
                      type="number"
                      value={editingRoomType.max_occupancy}
                      onChange={(e) => setEditingRoomType({...editingRoomType, max_occupancy: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type</label>
                    <select
                      value={editingRoomType.bed_type}
                      onChange={(e) => setEditingRoomType({...editingRoomType, bed_type: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="queen">Queen</option>
                      <option value="king">King</option>
                      <option value="twin">Twin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Count</label>
                    <input
                      type="number"
                      value={editingRoomType.bed_count}
                      onChange={(e) => setEditingRoomType({...editingRoomType, bed_count: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      min="1"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingRoomType.description}
                    onChange={(e) => setEditingRoomType({...editingRoomType, description: e.target.value})}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Room Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Features</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_balcony || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_balcony: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Balcony</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_kitchen || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_kitchen: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Kitchen</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_sea_view || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_sea_view: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Sea View</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_city_view || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_city_view: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">City View</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_bathtub || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_bathtub: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Bathtub</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRoomType.has_workspace || false}
                        onChange={(e) => setEditingRoomType({...editingRoomType, has_workspace: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Workspace</span>
                    </label>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editingRoomType.is_available !== false}
                      onChange={(e) => setEditingRoomType({...editingRoomType, is_available: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Available for booking</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowEditRoomModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await listingsAPI.updateRoomType(editingRoomType.id, editingRoomType);
                        setAllRoomTypes(allRoomTypes.map(room => 
                          room.id === editingRoomType.id ? editingRoomType : room
                        ));
                        setSuccess('Room type updated successfully');
                        setShowEditRoomModal(false);
                        setEditingRoomType(null);
                      } catch (err) {
                        setError('Failed to update room type. Please try again.');
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      <BookingDetailModal
        selectedBooking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        bookingActionLoadingId={bookingActionLoadingId}
        bookingActivityLog={bookingActivityLog}
        handleBookingStatusUpdate={handleBookingStatusUpdate}
        getStatusColor={getStatusColor}
        formatCurrency={formatCurrency}
        timeAgo={timeAgo}
      />

      <ConfirmDialog
        isOpen={Boolean(hotelToDelete)}
        title="Delete Hotel?"
        message="This action removes this hotel from your dashboard and cannot be easily undone."
        confirmLabel="Delete Hotel"
        cancelLabel="Keep Hotel"
        isLoading={isDeletingHotel}
        onConfirm={handleDeleteHotel}
        onCancel={() => setHotelToDelete(null)}
        tone="danger"
      />

  </>
  );
};

export default HostDashboardModals;
