import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useBnBListings } from '../contexts/BnBListingsContext';
import ComprehensiveBnBForm from '../components/forms/ComprehensiveBnBForm';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  MapPinIcon,
  HomeIcon,
  WifiIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PhotoIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

const BnBHostManagementPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const { listings, addListing, updateListing, deleteListing, setListings } = useBnBListings();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    occupancyRate: 0,
    monthlyGrowth: 0
  });

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate loading delay
      setTimeout(() => {
        // Calculate analytics from current listings
        const totalListings = listings.length;
        const activeListings = listings.filter(l => l.status === 'active').length;
        const totalBookings = listings.reduce((sum, l) => sum + (l.bookings || 0), 0);
        const totalRevenue = listings.reduce((sum, l) => sum + (l.revenue || 0), 0);
        const averageRating = listings.length > 0 
          ? listings.reduce((sum, l) => sum + (l.rating || 0), 0) / listings.length 
          : 0;
        const occupancyRate = totalListings > 0 ? Math.round((activeListings / totalListings) * 100) : 0;
        const monthlyGrowth = 12.5; // Mock growth rate

        setAnalytics({
          totalListings,
          activeListings,
          totalBookings,
          totalRevenue,
          averageRating,
          occupancyRate,
          monthlyGrowth
        });

        setIsLoading(false);
      }, 500);
    };

    loadData();
  }, [listings]);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || listing.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDeleteListing = (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        deleteListing(id);
        showSuccess(
          'Listing Deleted!',
          'The BnB listing has been successfully deleted.',
          5000
        );
      } catch (error) {
        showError(
          'Delete Failed',
          'There was an error deleting the listing. Please try again.',
          7000
        );
      }
    }
  };

  const handleToggleStatus = (id) => {
    try {
      const listing = listings.find(l => l.id === id);
      if (listing) {
        const updatedListing = {
          ...listing,
          status: listing.status === 'active' ? 'inactive' : 'active'
        };
        updateListing(updatedListing);
        
        showSuccess(
          `Listing ${updatedListing.status === 'active' ? 'Activated' : 'Deactivated'}!`,
          `The BnB listing has been ${updatedListing.status === 'active' ? 'activated' : 'deactivated'} successfully.`,
          4000
        );
      }
    } catch (error) {
      showError(
        'Status Update Failed',
        'There was an error updating the listing status. Please try again.',
        7000
      );
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/host/bnb/${id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your BnB listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BnB Management</h1>
              <p className="mt-2 text-gray-600">Manage your BnB listings, bookings, and analytics</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add New BnB</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalListings}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              <span>+2 this month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeListings}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <span>{Math.round((analytics.activeListings / analytics.totalListings) * 100)}% of total</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalBookings}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CalendarIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              <span>+{analytics.monthlyGrowth}% this month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">KSh {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <CurrencyDollarIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              <span>+15.2% this month</span>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="created_at">Newest First</option>
                <option value="title">Title A-Z</option>
                <option value="price">Price Low-High</option>
                <option value="rating">Rating High-Low</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <HomeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Listings Grid/List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }
        >
          <AnimatePresence>
            {filteredListings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Image */}
                <div className={`${viewMode === 'list' ? 'w-64 h-48' : 'h-48'} bg-gray-200 relative`}>
                  <img
                    src={listing.images && listing.images.length > 0 ? listing.images[0] : '/api/placeholder/400/300'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(listing.status)}`}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                      <HeartIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                      <ShareIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900">{listing.rating}</span>
                      <span className="text-sm text-gray-500">({listing.reviews})</span>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    <span className="text-sm">{listing.location}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <UsersIcon className="w-4 h-4 mr-1" />
                        <span>{listing.guests}</span>
                      </div>
                      <div className="flex items-center">
                        <HomeIcon className="w-4 h-4 mr-1" />
                        <span>{listing.bedrooms}</span>
                      </div>
                      <div className="flex items-center">
                        <WifiIcon className="w-4 h-4 mr-1" />
                        <span>{listing.bathrooms}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">KSh {(listing.price || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">per night</p>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(listing.amenities || []).slice(0, 3).map((amenity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {(listing.amenities || []).length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{(listing.amenities || []).length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Bookings</p>
                      <p className="font-semibold text-gray-900">{listing.bookings || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-semibold text-gray-900">KSh {(listing.revenue || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingListing(listing)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(listing.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          listing.status === 'active'
                            ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={listing.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {listing.status === 'active' ? (
                          <ExclamationTriangleIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleViewDetails(listing.id)}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredListings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <HomeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first BnB listing.'
              }
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200"
            >
              Add Your First BnB
            </button>
          </motion.div>
        )}
      </div>

      {/* Comprehensive Add/Edit Form Modal */}
      <AnimatePresence>
        {(showAddForm || editingListing) && (
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
                editingListing={editingListing}
                onClose={() => {
                  setShowAddForm(false);
                  setEditingListing(null);
                }}
                onSave={(listingData) => {
                  try {
                    if (editingListing) {
                      console.log('Editing listing data:', listingData);
                      console.log('Photos from form:', listingData.photos);
                      console.log('Images from form:', listingData.images);
                      
                      const updatedListing = {
                        ...listingData,
                        // Map photos to images for compatibility when editing
                        images: listingData.photos && listingData.photos.length > 0 ? listingData.photos : (listingData.images || ['/api/placeholder/400/300']),
                        // Map pricePerNight to price for compatibility when editing
                        price: listingData.pricePerNight || listingData.price || 0,
                      };
                      
                      console.log('Updated listing with images:', updatedListing.images);
                      updateListing(updatedListing);
                      showSuccess(
                        'Listing Updated!',
                        'Your BnB listing has been successfully updated.',
                        5000
                      );
                    } else {
                      const newListing = {
                        id: Date.now(),
                        ...listingData,
                        // Map photos to images for compatibility
                        images: listingData.photos && listingData.photos.length > 0 ? listingData.photos : ['/api/placeholder/400/300'],
                        // Map pricePerNight to price for compatibility
                        price: listingData.pricePerNight || 0,
                        status: 'active',
                        bookings: 0,
                        revenue: 0,
                        created_at: new Date().toISOString()
                      };
                      addListing(newListing);
                      showSuccess(
                        'Listing Created!',
                        'Your new BnB listing has been successfully created and published.',
                        5000
                      );
                    }
                    setShowAddForm(false);
                    setEditingListing(null);
                  } catch (error) {
                    showError(
                      'Operation Failed',
                      'There was an error saving your listing. Please try again.',
                      7000
                    );
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BnBHostManagementPage;