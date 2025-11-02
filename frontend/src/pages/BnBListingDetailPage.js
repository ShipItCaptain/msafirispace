import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useBnBListings } from '../contexts/BnBListingsContext';
import ComprehensiveBnBForm from '../components/forms/ComprehensiveBnBForm';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  MapPinIcon,
  HomeIcon,
  WifiIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  HeartIcon,
  ShareIcon,
  XMarkIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const BnBListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const { getListingById, updateListing, deleteListing } = useBnBListings();
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load listing data from context
  useEffect(() => {
    const loadListing = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        const foundListing = getListingById(id);
        if (foundListing) {
          setListing(foundListing);
        } else {
          setListing(null);
        }
        setIsLoading(false);
      }, 500);
    };

    loadListing();
  }, [id, getListingById]);

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        deleteListing(parseInt(id));
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        showSuccess(
          'Listing Deleted!',
          'The BnB listing has been successfully deleted.',
          5000
        );
        navigate('/host/bnb');
      }, 1000);
    } catch (error) {
      setIsDeleting(false);
      showError(
        'Delete Failed',
        'There was an error deleting the listing. Please try again.',
        7000
      );
    }
  };

  const handleSave = (updatedData) => {
    try {
      // Simulate API call delay
      setTimeout(() => {
        const updatedListing = {
          ...updatedData,
          // Map photos to images for compatibility when editing
          images: updatedData.photos && updatedData.photos.length > 0 ? updatedData.photos : (updatedData.images || ['/api/placeholder/400/300']),
          // Map pricePerNight to price for compatibility when editing
          price: updatedData.pricePerNight || updatedData.price || 0,
        };
        updateListing(updatedListing);
        setListing(prev => ({ ...prev, ...updatedListing }));
        setShowEditForm(false);
        showSuccess(
          'Changes Updated!',
          'Your BnB listing has been successfully updated.',
          5000
        );
      }, 1000);
    } catch (error) {
      showError(
        'Update Failed',
        'There was an error updating your listing. Please try again.',
        7000
      );
    }
  };

  const propertyTypes = {
    'apartment': 'Apartment',
    'house': 'House',
    'villa': 'Villa',
    'condo': 'Condo',
    'studio': 'Studio',
    'loft': 'Loft',
    'townhouse': 'Townhouse',
    'cabin': 'Cabin',
    'other': 'Other'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-6">The listing you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/host/bnb')}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/host/bnb')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
                <p className="text-gray-600">{listing.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                listing.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {listing.status}
              </span>
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                {(listing.images || []).map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`${listing.title} - Image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/80 rounded-full">
                        <PhotoIcon className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About this place</h2>
              <p className="text-gray-700 leading-relaxed mb-6">{listing.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{listing.guests} guests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <HomeIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{listing.bedrooms} bedrooms</span>
                </div>
                <div className="flex items-center space-x-2">
                  <WifiIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{listing.bathrooms} bathrooms</span>
                </div>
                <div className="flex items-center space-x-2">
                  <HomeIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{propertyTypes[listing.propertyType]}</span>
                </div>
              </div>
            </motion.div>

            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What this place offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(listing.amenities || []).map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* House Rules */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">House rules</h2>
              <div className="space-y-3">
                {(listing.houseRules || []).map((rule, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-700">{rule}</span>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="font-medium text-gray-900">Additional Policies</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Smoking:</span>
                      <span className={`text-sm font-medium ${listing.smokingAllowed ? 'text-green-600' : 'text-red-600'}`}>
                        {listing.smokingAllowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Pets:</span>
                      <span className={`text-sm font-medium ${listing.petsAllowed ? 'text-green-600' : 'text-red-600'}`}>
                        {listing.petsAllowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Parties:</span>
                      <span className={`text-sm font-medium ${listing.partiesAllowed ? 'text-green-600' : 'text-red-600'}`}>
                        {listing.partiesAllowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Children:</span>
                      <span className={`text-sm font-medium ${listing.childrenAllowed ? 'text-green-600' : 'text-red-600'}`}>
                        {listing.childrenAllowed ? 'Allowed' : 'Not allowed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Location & Nearby */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Where you'll be</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{listing.address}</p>
                    <p className="text-gray-600">{listing.city}, {listing.country}</p>
                  </div>
                </div>
                
                {listing.nearbyAttractions && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Nearby attractions</h3>
                    <p className="text-gray-700">{listing.nearbyAttractions}</p>
                  </div>
                )}
                
                {listing.transportation && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Getting around</h3>
                    <p className="text-gray-700">{listing.transportation}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900">KSh {(listing.price || 0).toLocaleString()}</p>
                  <p className="text-gray-600">per night</p>
                </div>
                <div className="flex items-center space-x-1">
                  <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-medium">{listing.rating}</span>
                  <span className="text-gray-500">({listing.reviews} reviews)</span>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cleaning fee</span>
                  <span className="font-medium">KSh {(listing.cleaningFee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security deposit</span>
                  <span className="font-medium">KSh {(listing.securityDeposit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minimum stay</span>
                  <span className="font-medium">{listing.minimumNights} nights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maximum stay</span>
                  <span className="font-medium">{listing.maximumNights} nights</span>
                </div>
              </div>
            </motion.div>

            {/* Check-in/out Times */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Check-in & Check-out</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="font-medium">{listing.checkInTime}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Check-out</p>
                    <p className="font-medium">{listing.checkOutTime}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Host Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Host information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium">{listing.hostName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-medium">{listing.hostPhone}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{listing.hostEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600">Emergency contact</p>
                  <p className="font-medium">{listing.emergencyContact}</p>
                </div>
              </div>
            </motion.div>

            {/* Special Instructions */}
            {listing.specialInstructions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-4">Special instructions</h3>
                <p className="text-sm text-gray-700">{listing.specialInstructions}</p>
              </motion.div>
            )}

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Listing statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total bookings</span>
                  <span className="font-medium">{listing.bookings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total revenue</span>
                  <span className="font-medium">KSh {(listing.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">{new Date(listing.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last booking</span>
                  <span className="font-medium">{new Date(listing.last_booking).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
            >
              <ComprehensiveBnBForm
                editingListing={listing}
                onClose={() => setShowEditForm(false)}
                onSave={handleSave}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-full">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete listing</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{listing.title}"? This action cannot be undone and will remove all associated data.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BnBListingDetailPage;
