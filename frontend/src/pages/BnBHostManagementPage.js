import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { bnbAPI, bookingsAPI, reviewsAPI } from '../services/api';
import ComprehensiveBnBForm from '../components/forms/ComprehensiveBnBForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AvailabilityCalendarModal from '../components/bnb/AvailabilityCalendarModal';
import BnBBookingsPanel from './dashboard/BnBBookingsPanel';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  HomeIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

const BnBHostManagementPage = () => {
  const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">No image</text></svg>';
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotifications();
  const [listings, setListings] = useState([]);
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
    averageRating: 0
  });
  const [listingToDelete, setListingToDelete] = useState(null);
  const [isDeletingListing, setIsDeletingListing] = useState(false);
  const [availabilityListing, setAvailabilityListing] = useState(null);
  const [activeSection, setActiveSection] = useState(location.state?.initialTab === 'bookings' ? 'bookings' : 'listings');

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveSection(location.state.initialTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Load data from API when component mounts
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [listingsResponse, hostBookingsResponse] = await Promise.all([
          bnbAPI.getMyListings(),
          bookingsAPI.getHostBookings(),
        ]);
        const data = listingsResponse?.results || listingsResponse || [];
        const hostBookings = hostBookingsResponse?.results || hostBookingsResponse || [];
        const safeListings = Array.isArray(data) ? data : [];
        const safeHostBookings = Array.isArray(hostBookings) ? hostBookings : [];
        setListings(safeListings);

        const totalListings = safeListings.length;
        const activeListings = safeListings.filter((listing) => listing.is_active !== false).length;
        const bnbListingIds = new Set(safeListings.map((listing) => listing.id));
        const bnbBookings = safeHostBookings.filter(
          (booking) => booking.booking_type === 'bnb' && bnbListingIds.has(booking.bnb_listing_id)
        );
        const totalBookings = bnbBookings.length;
        const totalRevenue = bnbBookings
          .filter((booking) => booking.status !== 'cancelled')
          .reduce((sum, booking) => sum + (parseFloat(booking.total_amount) || 0), 0);

        const reviewStatsResponses = await Promise.allSettled(
          safeListings.map((listing) => reviewsAPI.getBnBReviewStats(listing.id))
        );
        const reviewStats = reviewStatsResponses
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
          .filter(Boolean);
        const totalReviews = reviewStats.reduce((sum, stats) => sum + (stats.total_reviews || 0), 0);
        const weightedRating = reviewStats.reduce(
          (sum, stats) => sum + ((stats.average_rating || 0) * (stats.total_reviews || 0)),
          0
        );
        const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0;
        setAnalytics({
          totalListings,
          activeListings,
          totalBookings,
          totalRevenue,
          averageRating: Number(averageRating.toFixed(2))
        });
      } catch (error) {
        console.error('Failed to load BnB listings:', error);
        showError('Failed to Load Listings', 'Could not load your BnB listings. Please try again.', 7000);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showError]);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && listing.is_active !== false) ||
                         (filterStatus === 'inactive' && listing.is_active === false);
    return matchesSearch && matchesFilter;
  });

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    try {
      setIsDeletingListing(true);
      await bnbAPI.remove(listingToDelete);
      setListings(prev => prev.filter(l => l.id !== listingToDelete));
      showSuccess(
        'Listing Deleted!',
        'The BnB listing has been successfully deleted.',
        5000
      );
      setListingToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      showError(
        'Delete Failed',
        error?.response?.data?.detail || 'There was an error deleting the listing. Please try again.',
        7000
      );
    } finally {
      setIsDeletingListing(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const listing = listings.find(l => l.id === id);
      if (listing) {
        const updatedListing = await bnbAPI.update(id, {
          ...listing,
          is_active: !listing.is_active
        });
        setListings(prev => prev.map(l => l.id === id ? updatedListing : l));
        
        showSuccess(
          `Listing ${updatedListing.is_active ? 'Activated' : 'Deactivated'}!`,
          `The BnB listing has been ${updatedListing.is_active ? 'activated' : 'deactivated'} successfully.`,
          4000
        );
      }
    } catch (error) {
      console.error('Status update error:', error);
      showError(
        'Status Update Failed',
        error?.response?.data?.detail || 'There was an error updating the listing status. Please try again.',
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
        {/* Section Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveSection('listings')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeSection === 'listings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Listings
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('bookings')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeSection === 'bookings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bookings
          </button>
        </div>

        {activeSection === 'bookings' && <BnBBookingsPanel />}

        {activeSection === 'listings' && (
        <>
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
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <span>Current host inventory</span>
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
              <span>
                {analytics.totalListings > 0
                  ? `${Math.round((analytics.activeListings / analytics.totalListings) * 100)}% active`
                  : '0% active'}
                {` • Avg rating ${Number(analytics.averageRating || 0).toFixed(1)}`}
              </span>
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
              <span>Real-time booking count</span>
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
              <span>From non-cancelled BnB bookings</span>
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
                    src={
                      // Prefer backend-provided primary_image if available
                      listing.primary_image
                        ? listing.primary_image
                        : (listing.images && listing.images.length > 0
                            ? (typeof listing.images[0] === 'string'
                                ? listing.images[0]
                                : listing.images[0]?.image)
                            : FALLBACK_IMAGE)
                    }
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(listing.is_active !== false ? 'active' : 'inactive')}`}>
                      {listing.is_active !== false ? 'Active' : 'Inactive'}
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
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {listing.property_type || 'bnb'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    <span className="text-sm">{listing.city}, {listing.country}</span>
                  </div>

                  {listing.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      {listing.address && (
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 mr-1" />
                          <span className="line-clamp-1">{listing.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">KSh {(listing.price_per_night || 0).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">per night</p>
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
                          listing.is_active !== false
                            ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={listing.is_active !== false ? 'Deactivate' : 'Activate'}
                      >
                        {listing.is_active !== false ? (
                          <ExclamationTriangleIcon className="w-4 h-4" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setListingToDelete(listing.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAvailabilityListing(listing)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Manage Availability"
                      >
                        <CalendarIcon className="w-4 h-4" />
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
        </>
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
                onSave={async (listingData) => {
                  try {
                    // Map form data to API format with all new fields
                    const apiData = {
                      title: listingData.title || listingData.propertyName || '',
                      description: listingData.description || '',
                      property_type: listingData.propertyType || 'apartment',
                      address: listingData.address || '',
                      city: listingData.city || '',
                      state_province: listingData.stateProvince || listingData.state || '',
                      country: listingData.country || 'Kenya',
                      postal_code: listingData.postalCode || '',
                      latitude: listingData.latitude ? parseFloat(listingData.latitude) : null,
                      longitude: listingData.longitude ? parseFloat(listingData.longitude) : null,
                      price_per_night: parseFloat(listingData.pricePerNight || listingData.price || 0),
                      cleaning_fee: listingData.cleaningFee ? parseFloat(listingData.cleaningFee) : 0,
                      security_deposit: listingData.securityDeposit ? parseFloat(listingData.securityDeposit) : 0,
                      currency: listingData.currency || 'KES',
                      bedrooms: parseInt(listingData.bedrooms || 1),
                      bathrooms: parseInt(listingData.bathrooms || 1),
                      beds: parseInt(listingData.beds || 1),
                      max_guests: parseInt(listingData.guests || listingData.maxGuests || 2),
                      square_footage: listingData.squareFootage ? parseInt(listingData.squareFootage) : null,
                      year_built: listingData.yearBuilt ? parseInt(listingData.yearBuilt) : null,
                      check_in_time: listingData.checkInTime || '15:00:00',
                      check_out_time: listingData.checkOutTime || '11:00:00',
                      minimum_nights: parseInt(listingData.minimumNights || 1),
                      maximum_nights: parseInt(listingData.maximumNights || 30),
                      amenities: Array.isArray(listingData.amenities) ? listingData.amenities : [],
                      house_rules: Array.isArray(listingData.houseRules) ? listingData.houseRules : [],
                      smoking_allowed: listingData.smokingAllowed || false,
                      pets_allowed: listingData.petsAllowed || false,
                      parties_allowed: listingData.partiesAllowed || false,
                      children_allowed: listingData.childrenAllowed !== undefined ? listingData.childrenAllowed : true,
                      highlights: Array.isArray(listingData.highlights) ? listingData.highlights : [],
                      transportation: listingData.transportation || '',
                      special_instructions: listingData.specialInstructions || '',
                      host_name: listingData.hostName || '',
                      host_phone: listingData.hostPhone || '',
                      host_email: listingData.hostEmail || '',
                      emergency_contact: listingData.emergencyContact || '',
                      is_active: true
                    };

                    let savedListing;
                    if (editingListing) {
                      // Update existing listing
                      savedListing = await bnbAPI.update(editingListing.id, apiData);
                      setListings(prev => prev.map(l => l.id === editingListing.id ? savedListing : l));
                    } else {
                      // Create new listing
                      savedListing = await bnbAPI.create(apiData);
                      setListings(prev => [savedListing, ...prev]);
                    }

                    // Upload images if provided
                    if (listingData.photos && listingData.photos.length > 0) {
                      console.log('Preparing to upload images:', listingData.photos.length, 'photos');
                      
                      const imageUploadPromises = listingData.photos
                        .map((photo, index) => {
                          // Skip existing images (from editing mode) - they're already on the server
                          if (photo.isExisting) {
                            console.log(`Skipping existing image at index ${index}`);
                            return null;
                          }
                          
                          // Handle both object format {file, preview, id} and direct File objects
                          const file = photo.file || (photo instanceof File ? photo : null);
                          if (!file || !(file instanceof File)) {
                            console.warn(`Photo at index ${index} is not a valid File object:`, photo);
                            return null;
                          }
                          
                          console.log(`Uploading image ${index + 1}/${listingData.photos.length}:`, file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
                          
                          return bnbAPI.uploadImage(savedListing.id, {
                            image: file,
                            image_type: photo.image_type || 'exterior',
                            caption: photo.caption || '',
                            is_primary: photo.is_primary !== undefined ? photo.is_primary : (index === 0),
                            order: index
                          }).then(result => {
                            console.log(`Successfully uploaded image ${index + 1}:`, result);
                            return result;
                          }).catch(imgError => {
                            console.error(`Failed to upload image ${index + 1} (${file.name}):`, imgError);
                            // Log the full error details for debugging
                            if (imgError.response) {
                              console.error('Error response data:', imgError.response.data);
                              console.error('Error status:', imgError.response.status);
                              console.error('Error headers:', imgError.response.headers);
                            } else if (imgError.request) {
                              console.error('Request was made but no response received:', imgError.request);
                            } else {
                              console.error('Error setting up request:', imgError.message);
                            }
                            // Don't throw - let other uploads continue
                            return { error: imgError, index };
                          });
                        })
                        .filter(p => p !== null); // Remove null entries
                      
                      // Wait for all uploads to complete (success or failure)
                      const results = await Promise.allSettled(imageUploadPromises);
                      const failures = results.filter(r => r.status === 'rejected' || (r.value && r.value.error));
                      const successes = results.filter(r => r.status === 'fulfilled' && (!r.value || !r.value.error));
                      
                      console.log(`Image upload summary: ${successes.length} succeeded, ${failures.length} failed`);
                      if (failures.length > 0) {
                        console.warn('Some images failed to upload. Check console for details.');
                      }
                    }

                    // Re-fetch listings to get updated data with images
                    const response = await bnbAPI.getMyListings();
                    setListings(response?.results || response || []);
                    
                    showSuccess(
                      editingListing ? 'Listing Updated!' : 'Listing Created!',
                      editingListing 
                        ? 'Your BnB listing has been successfully updated.'
                        : 'Your new BnB listing has been successfully created and published.',
                      5000
                    );
                    setShowAddForm(false);
                    setEditingListing(null);
                  } catch (error) {
                    console.error('Save error:', error);
                    showError(
                      'Operation Failed',
                      error?.response?.data?.detail || error?.message || 'There was an error saving your listing. Please try again.',
                      7000
                    );
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={Boolean(listingToDelete)}
        title="Delete Listing?"
        message="This action cannot be undone. The listing and related data will no longer be available."
        confirmLabel="Delete Listing"
        cancelLabel="Keep Listing"
        isLoading={isDeletingListing}
        onConfirm={handleDeleteListing}
        onCancel={() => setListingToDelete(null)}
        tone="danger"
      />

      {availabilityListing && (
        <AvailabilityCalendarModal
          bnbId={availabilityListing.id}
          listingTitle={availabilityListing.title}
          basePrice={availabilityListing.price_per_night}
          currency={availabilityListing.currency || 'KES'}
          onClose={() => setAvailabilityListing(null)}
        />
      )}
    </div>
  );
};

export default BnBHostManagementPage;
