import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { listingsAPI, bookingsAPI, reviewsAPI } from '../services/api';
import { 
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  StarIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BellIcon,
  CogIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  XMarkIcon,
  CheckIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

const HotelHostDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  
  // Real data state
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    occupancyRate: 0,
    totalRooms: 0,
    availableRooms: 0,
    pendingBookings: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0
  });

  // Interactive features state
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [showEditHotelModal, setShowEditHotelModal] = useState(false);
  const [showRoomManagementModal, setShowRoomManagementModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  
  // Hotel configuration state tracking
  const [hotelConfigurationState, setHotelConfigurationState] = useState({});
  const [roomManagementView, setRoomManagementView] = useState('overview'); // 'overview', 'configure', 'rooms', 'analytics'
  const [isLoadingRoomTypes, setIsLoadingRoomTypes] = useState(false);
  
  // Room configuration state
  const [roomAmenities, setRoomAmenities] = useState([]);
  const [roomFeatures, setRoomFeatures] = useState({
    non_smoking: false,
    pet_friendly: false,
    wheelchair_accessible: false
  });
  const [roomAvailability, setRoomAvailability] = useState({
    total_rooms: 1,
    minimum_stay: 1
  });
  const [currentStep, setCurrentStep] = useState(1);
  
  // Manage Rooms state
  const [allRoomTypes, setAllRoomTypes] = useState([]);
  const [selectedHotelForRooms, setSelectedHotelForRooms] = useState(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterCategory, setRoomFilterCategory] = useState('all');
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState(null);
  
  const [newHotelData, setNewHotelData] = useState({
    // Basic Information
    name: '',
    description: '',
    property_type: 'hotel',
    star_rating: 3,
    
    // Location
    address: '',
    city: '',
    country: 'Kenya',
    latitude: '',
    longitude: '',
    
    // Contact & Policies
    phone: '',
    email: '',
    website: '',
    check_in_time: '14:00',
    check_out_time: '11:00',
    cancellation_policy: 'moderate',
    
    // Amenities
    amenities: [],
    
    // Room Types
    room_types: [{
      name: '',
      description: '',
      category: 'standard',
      bed_type: 'double',
      max_adults: 2,
      max_children: 1,
      base_price: 0,
      currency: 'USD',
      images: []
    }],
    
    // Images
    images: [],
    
    // Additional Info
    policies: {
      smoking_allowed: false,
      pets_allowed: false,
      children_allowed: true,
      minimum_age: 18
    }
  });


  const loadDashboardData = useCallback(async () => {
    setError('');
    
    try {
      console.log('🔍 Loading dashboard data...');
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      console.log('User type:', typeof user?.id);
      
      // Load hotels owned by current user (server-side filtered)
      const hotelsResponse = await listingsAPI.getUserListings();
      const userHotels = hotelsResponse?.results || hotelsResponse || [];
      setHotels(userHotels);

      // Load bookings for user's hotels
      const bookingsResponse = await bookingsAPI.getBookings();
      const hotelIds = (userHotels || []).map(hotel => hotel.id);
      const userBookings = bookingsResponse.results?.filter(booking => 
        hotelIds.includes(booking.hotel)
      ) || [];
      setBookings(userBookings);

      // Load reviews for user's hotels
      const allReviews = [];
      for (const hotel of userHotels) {
        try {
          const reviewsResponse = await reviewsAPI.getHotelReviews(hotel.id);
          allReviews.push(...(reviewsResponse.results || []));
        } catch (err) {
          console.log(`No reviews for hotel ${hotel.id}`);
        }
      }
      setReviews(allReviews);

      // Calculate stats
      calculateStats(userHotels, userBookings, allReviews);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    }
  }, [user?.id]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const calculateStats = (hotels, bookings, reviews) => {
    const totalBookings = bookings.length;
    const monthlyRevenue = bookings.reduce((sum, booking) => {
      const bookingDate = new Date(booking.created_at);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
        return sum + (booking.total_amount || 0);
      }
      return sum;
    }, 0);

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    const totalRooms = hotels.reduce((sum, hotel) => sum + (hotel.total_rooms || 0), 0);
    const occupiedRooms = bookings.filter(booking => 
      booking.status === 'confirmed' && 
      new Date(booking.check_in_date) <= new Date() && 
      new Date(booking.check_out_date) >= new Date()
    ).length;

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = bookings.filter(booking => 
      booking.check_in_date === today && booking.status === 'confirmed'
    ).length;
    const todayCheckOuts = bookings.filter(booking => 
      booking.check_out_date === today && booking.status === 'confirmed'
    ).length;
    const pendingBookings = bookings.filter(booking => booking.status === 'pending').length;

    setStats({
      totalBookings,
      monthlyRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      occupancyRate,
      totalRooms,
      availableRooms: totalRooms - occupiedRooms,
      pendingBookings,
      todayCheckIns,
      todayCheckOuts
    });
  };


  const handleAddHotel = async () => {
    setError('');
    setSuccess('');
    
    // Check if user is authenticated
    if (!user) {
      setError('You must be logged in to add a hotel.');
      return;
    }
    
    // Validate all required fields before submission
    const validation = validateAllRequiredFields();
    if (!validation.isValid) {
      setError(`Please complete the following required fields: ${validation.errors.join(', ')}`);
      return;
    }
    
    try {
      // Prepare hotel data according to backend model
      const hotelData = {
        name: newHotelData.name.trim(),
        description: newHotelData.description.trim(),
        short_description: newHotelData.description.trim().substring(0, 500), // Truncate for short description
        property_type: newHotelData.property_type || 'hotel',
        star_rating: parseInt(newHotelData.star_rating) || 3, // Ensure it's an integer
        address: newHotelData.address.trim(),
        city: newHotelData.city.trim(),
        country: newHotelData.country || 'Kenya',
        latitude: newHotelData.latitude ? parseFloat(newHotelData.latitude) : null,
        longitude: newHotelData.longitude ? parseFloat(newHotelData.longitude) : null,
        phone: newHotelData.phone?.trim() || null,
        email: newHotelData.email?.trim() || null,
        website: newHotelData.website?.trim() || null,
        // Note: host will be set automatically by the backend
      };
      
      console.log('Sending hotel data:', hotelData);
      console.log('Current user ID for host assignment:', user?.id);
      
      const createdHotel = await listingsAPI.createListing(hotelData);
      console.log('✅ Hotel created successfully:', createdHotel.name);
      console.log('Hotel ID:', createdHotel.id, 'Host ID:', createdHotel.host);
      console.log('Host ID type:', typeof createdHotel.host, 'User ID type:', typeof user?.id);
      console.log('Host matches user:', createdHotel.host == user?.id);
      
      if (createdHotel) {
        // Add room types to the created hotel object
        const hotelWithRoomTypes = {
          ...createdHotel,
          room_types: newHotelData.room_types
        };
        
        console.log('Room types being added:', newHotelData.room_types);
        console.log('Hotel with room types:', hotelWithRoomTypes);
        
        setHotels(prev => [...prev, hotelWithRoomTypes]);
        setShowAddHotelModal(false);
        resetForm();
        setSuccess('Hotel added successfully! Now configure your room types.');
        
        // Auto-open room management for the newly created hotel
        setTimeout(() => {
          console.log('Opening room management modal for hotel:', hotelWithRoomTypes);
          setSelectedHotel(hotelWithRoomTypes);
          setShowRoomManagementModal(true);
          console.log('Room management modal should be open now');
        }, 1000); // Small delay to show success message first
        
        // Don't call loadDashboardData() immediately as it might overwrite our local state
        // Instead, just update the local state and let the user see their hotel
        console.log('Hotel added to local state, not calling loadDashboardData() to avoid overwriting');
      } else {
        console.log('No hotel data returned from server');
        setError('Hotel created but no data returned from server');
      }
      
      // Reload data to get updated stats - commented out to avoid overwriting local state
      // await loadDashboardData();
      
    } catch (err) {
      console.error('Error adding hotel:', err);
      console.error('Error details:', err.response?.data);
      
      // Handle validation errors
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          setError(`Validation errors: ${fieldErrors}`);
        } else {
          setError(errorData || 'Please check all required fields and try again.');
        }
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to add hotel. Please try again.');
      }
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Helper functions for validation
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation function for Review step and Submit
  const validateAllRequiredFields = () => {
    const errors = [];
    
    // Step 1: Basic Information
    if (!newHotelData.name?.trim()) {
      errors.push('Hotel name is required');
    }
    if (!newHotelData.description?.trim()) {
      errors.push('Hotel description is required');
    }
    if (!newHotelData.star_rating || newHotelData.star_rating < 1 || newHotelData.star_rating > 5) {
      errors.push('Star rating is required (1-5 stars)');
    }
    
    // Step 2: Location
    if (!newHotelData.address?.trim()) {
      errors.push('Hotel address is required');
    }
    if (!newHotelData.city?.trim()) {
      errors.push('City is required');
    }
    
    // Validate optional fields if provided
    if (newHotelData.website?.trim() && !isValidUrl(newHotelData.website.trim())) {
      errors.push('Website must be a valid URL (e.g., https://example.com)');
    }
    if (newHotelData.email?.trim() && !isValidEmail(newHotelData.email.trim())) {
      errors.push('Email must be a valid email address');
    }
    
    // Step 4: Room Types
    if (!newHotelData.room_types || newHotelData.room_types.length === 0) {
      errors.push('At least one room type is required');
    } else {
      const validRooms = newHotelData.room_types.filter(room => 
        room.name?.trim() && room.base_price > 0
      );
      if (validRooms.length === 0) {
        errors.push('At least one room type with name and price is required');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  // Check if user can proceed to Review step (step 5)
  const canProceedToReview = () => {
    const validation = validateAllRequiredFields();
    return validation.isValid;
  };

  const resetForm = () => {
    setCurrentStep(1);
    setNewHotelData({
      name: '',
      description: '',
      property_type: 'hotel',
      star_rating: 3,
      address: '',
      city: '',
      country: 'Kenya',
      latitude: '',
      longitude: '',
      phone: '',
      email: '',
      website: '',
      check_in_time: '14:00',
      check_out_time: '11:00',
      cancellation_policy: 'moderate',
      amenities: [],
      room_types: [{
        name: '',
        description: '',
        category: 'standard',
        bed_type: 'double',
        max_adults: 2,
        max_children: 1,
        base_price: 0,
        currency: 'USD',
        images: []
      }],
      images: [],
      policies: {
        smoking_allowed: false,
        pets_allowed: false,
        children_allowed: true,
        minimum_age: 18
      }
    });
  };


  const handleDeleteHotel = async (hotelId) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;
    
    setError('');
    
    try {
      await listingsAPI.deleteListing(hotelId);
      setHotels(prev => prev.filter(hotel => hotel.id !== hotelId));
      setSuccess('Hotel deleted successfully!');
      
      // Reload data to get updated stats
      await loadDashboardData();
      
    } catch (err) {
      console.error('Error deleting hotel:', err);
      setError('Failed to delete hotel. Please try again.');
    }
  };


  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'hotels', name: 'My Hotels', icon: BuildingOfficeIcon },
    { id: 'rooms', name: 'Manage Rooms', icon: HomeIcon },
    { id: 'bookings', name: 'Bookings', icon: CalendarIcon },
    { id: 'analytics', name: 'Analytics', icon: ArrowTrendingUpIcon },
    { id: 'reviews', name: 'Reviews', icon: StarIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
            <button 
              onClick={() => setSuccess('')}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>All time bookings</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>This month</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating || 'N/A'}</p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>From {reviews.length} reviews</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
            </div>
            <UsersIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span>{stats.occupiedRooms || 0} of {stats.totalRooms} rooms</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setShowAddHotelModal(true)}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <PlusIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-600">Add New Hotel</span>
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <CalendarIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-600">Manage Bookings</span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-600">View Analytics</span>
          </button>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{booking.guest_name || 'Guest'}</p>
                  <p className="text-sm text-gray-600">{booking.hotel_name || 'Hotel'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(booking.total_amount || 0)}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <p className="text-gray-500 text-center py-4">No bookings yet</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="font-medium text-gray-900">Check-ins</p>
                  <p className="text-sm text-gray-600">{stats.todayCheckIns} guests</p>
                </div>
              </div>
              <ClockIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="font-medium text-gray-900">Check-outs</p>
                  <p className="text-sm text-gray-600">{stats.todayCheckOuts} guests</p>
                </div>
              </div>
              <ClockIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="font-medium text-gray-900">Pending Bookings</p>
                  <p className="text-sm text-gray-600">{stats.pendingBookings} requests</p>
                </div>
              </div>
              <BellIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderHotels = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Hotels</h2>
        <button 
          onClick={() => setShowAddHotelModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Hotel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {hotels.map((hotel) => (
          <motion.div
            key={hotel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Compact Header with Image */}
            <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="absolute inset-0 bg-black bg-opacity-10"></div>
              <div className="absolute top-2 right-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  hotel.is_verified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {hotel.is_verified ? 'Active' : 'Pending'}
                </span>
              </div>
              <div className="absolute bottom-2 left-2 text-white">
                <h3 className="text-sm font-bold truncate max-w-[180px]">{hotel.name}</h3>
                <p className="text-xs opacity-90 flex items-center">
                  <MapPinIcon className="h-3 w-3 mr-1" />
                  {hotel.city}, {hotel.country}
                </p>
              </div>
            </div>
            
            {/* Compact Content */}
            <div className="p-3">
              {/* Key Stats Row */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <StarIcon className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-xs font-medium text-gray-900">{hotel.star_rating || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {hotel.total_rooms || 0} rooms
                  </div>
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {hotel.property_type || 'Hotel'}
                </div>
              </div>
              
              {/* Room Types Summary */}
              {hotel.room_types && hotel.room_types.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">
                    {hotel.room_types.length} room type{hotel.room_types.length > 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1">
                    {hotel.room_types.slice(0, 2).map((room, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 truncate block">
                            {room.name || `Room ${index + 1}`}
                          </span>
                          <span className="text-gray-500">
                            {room.currency} {room.base_price}/night
                          </span>
                        </div>
                        <div className="ml-2">
                          {room.id ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⏳
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {hotel.room_types.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{hotel.room_types.length - 2} more room types
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Compact Action Buttons */}
              <div className="flex space-x-1">
                <button 
                  onClick={async () => {
                    console.log('Manage button clicked for hotel:', hotel);
                    console.log('Hotel room types:', hotel.room_types);
                    
                    setIsLoadingRoomTypes(true);
                    
                    try {
                      // Try to fetch room types from the server
                      const roomTypesResponse = await listingsAPI.getHotelRoomTypes(hotel.id);
                      console.log('Fetched room types:', roomTypesResponse);
                      
                      const roomTypes = roomTypesResponse.results || roomTypesResponse.data || roomTypesResponse || [];
                      console.log('📊 Room types array:', roomTypes);
                      console.log('📊 Room types length:', roomTypes.length);
                      
                      const hotelWithRoomTypes = {
                        ...hotel,
                        room_types: roomTypes
                      };
                      
                      console.log('Hotel with room types:', hotelWithRoomTypes);
                      
                      // Check if hotel has been configured
                      const hasRoomTypes = Array.isArray(roomTypes) && roomTypes.length > 0;
                      
                      console.log('✅ Has room types:', hasRoomTypes);
                      
                      // Store configuration state
                      setHotelConfigurationState({
                        hasRoomTypes,
                        isConfigured: hasRoomTypes
                      });
                      
                      // Set initial view based on configuration state
                      setRoomManagementView(hasRoomTypes ? 'overview' : 'configure');
                      
                      setSelectedHotel(hotelWithRoomTypes);
                      setShowRoomManagementModal(true);
                      setIsLoadingRoomTypes(false);
                    } catch (error) {
                      console.error('Error fetching room types:', error);
                      // Fallback to existing room types or empty array
                      const roomTypes = hotel.room_types || [];
                      const hasRoomTypes = Array.isArray(roomTypes) && roomTypes.length > 0;
                      
                      console.log('⚠️ Fallback - Has room types:', hasRoomTypes);
                      
                      setHotelConfigurationState({
                        hasRoomTypes,
                        isConfigured: hasRoomTypes
                      });
                      setRoomManagementView(hasRoomTypes ? 'overview' : 'configure');
                      
                      const hotelWithRoomTypes = {
                        ...hotel,
                        room_types: roomTypes
                      };
                      setSelectedHotel(hotelWithRoomTypes);
                      setShowRoomManagementModal(true);
                      setIsLoadingRoomTypes(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={isLoadingRoomTypes}
                >
                  <CogIcon className="h-3 w-3 mr-1" />
                  {isLoadingRoomTypes ? 'Loading...' : 'Manage'}
                </button>
                <button 
                  onClick={() => {
                    setSelectedHotel(hotel);
                    setShowEditHotelModal(true);
                  }}
                  className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <PencilIcon className="h-3 w-3 mr-1" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteHotel(hotel.id)}
                  className="flex items-center justify-center px-2 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {hotels.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first hotel property.</p>
            <button 
              onClick={() => setShowAddHotelModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Hotel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bookings Management</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Export
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Calendar View
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.slice(0, 10).map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.guest}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Nairobi Grand Hotel
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.room}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.checkIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.checkOut}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(booking.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      <button className="text-green-600 hover:text-green-900">Confirm</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Chart placeholder - Revenue over time</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Chart placeholder - Occupancy trends</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="font-medium text-gray-900 mr-2">{review.guest}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-2">{review.comment}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>{review.hotel}</span>
                  <span className="mx-2">•</span>
                  <span>{review.date}</span>
                </div>
              </div>
              <button className="ml-4 text-blue-600 hover:text-blue-800">
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const loadRoomTypes = useCallback(async () => {
    try {
      console.log('Loading room types for all hotels...');
      
      // Load all user hotels
      const hotelsResponse = await listingsAPI.getListings();
      const userHotels = hotelsResponse.results?.filter(hotel => 
        String(hotel.host) === String(user?.id)
      ) || [];
      
      // Load room types for each hotel
      const allRooms = [];
      for (const hotel of userHotels) {
        try {
          const roomTypesResponse = await listingsAPI.getHotelRoomTypes(hotel.id);
          const roomTypes = roomTypesResponse.results || roomTypesResponse.data || roomTypesResponse || [];
          
          // Add hotel info to each room type
          const roomsWithHotel = roomTypes.map(room => ({
            ...room,
            hotel_name: hotel.name,
            hotel_id: hotel.id,
            hotel_location: `${hotel.city}, ${hotel.country}`
          }));
          
          allRooms.push(...roomsWithHotel);
        } catch (err) {
          console.log(`No room types for hotel ${hotel.name}`);
        }
      }
      
      console.log('Loaded room types:', allRooms.length);
      setAllRoomTypes(allRooms);
    } catch (err) {
      console.error('Error loading room types:', err);
      setError('Failed to load room types. Please try again.');
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      loadRoomTypes();
    }
  }, [activeTab, loadRoomTypes]);

  const renderManageRooms = () => {
    // Filter room types based on search and category
    const filteredRooms = allRoomTypes.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                           room.hotel_name.toLowerCase().includes(roomSearchQuery.toLowerCase());
      const matchesCategory = roomFilterCategory === 'all' || room.category === roomFilterCategory;
      return matchesSearch && matchesCategory;
    });

    const categories = ['all', 'standard', 'deluxe', 'suite', 'presidential', 'family', 'executive', 'studio', 'penthouse'];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Rooms</h2>
            <p className="text-gray-600 mt-1">View and edit all your room types</p>
          </div>
          <button
            onClick={() => {
              setActiveTab('hotels');
              setShowAddHotelModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Room Type
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Rooms</label>
              <input
                type="text"
                placeholder="Search by room name or hotel..."
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <select
                value={roomFilterCategory}
                onChange={(e) => setRoomFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Room Types Grid */}
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Room Image */}
                <div className="h-48 bg-gray-200 relative">
                  {room.images && room.images.length > 0 && room.images[0] ? (
                    <img
                      src={room.images[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <HomeIcon className="h-16 w-16" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      room.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {room.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>

                {/* Room Details */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{room.name}</h3>
                    <p className="text-sm text-gray-500">{room.hotel_name}</p>
                    <p className="text-xs text-gray-400">{room.hotel_location}</p>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Category:</span>
                      <span className="ml-2 capitalize">{room.category}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Bed:</span>
                      <span className="ml-2 capitalize">{room.bed_type} ({room.bed_count}x)</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Max Occupancy:</span>
                      <span className="ml-2">{room.max_occupancy} guests</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Price:</span>
                      <span className="ml-2 text-blue-600 font-semibold">
                        {formatCurrency(room.base_price)}/night
                      </span>
                    </div>
                  </div>

                  {/* Room Features */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {room.has_balcony && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Balcony</span>
                      )}
                      {room.has_kitchen && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Kitchen</span>
                      )}
                      {room.has_sea_view && (
                        <span className="px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded">Sea View</span>
                      )}
                      {room.has_city_view && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">City View</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingRoomType(room);
                        setShowEditRoomModal(true);
                      }}
                      className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete "${room.name}"?`)) {
                          try {
                            await listingsAPI.updateListing(room.hotel_id, {
                              room_types: allRoomTypes.filter(r => r.id !== room.id)
                            });
                            setAllRoomTypes(allRoomTypes.filter(r => r.id !== room.id));
                            setSuccess('Room type deleted successfully');
                          } catch (err) {
                            setError('Failed to delete room type. Please try again.');
                          }
                        }
                      }}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <HomeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Room Types Found</h3>
            <p className="text-gray-600 mb-4">
              {roomSearchQuery || roomFilterCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding room types to your hotels.'}
            </p>
            {!roomSearchQuery && roomFilterCategory === 'all' && (
              <button
                onClick={() => setActiveTab('hotels')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Room Types
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Your hotel business name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="contact@yourhotel.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="+254 700 000 000" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">New booking notifications</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Review notifications</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
              <span className="ml-2 text-sm text-gray-700">Marketing emails</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'hotels': return renderHotels();
      case 'rooms': return renderManageRooms();
      case 'bookings': return renderBookings();
      case 'analytics': return renderAnalytics();
      case 'reviews': return renderReviews();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  // Reset room configuration state when switching room types
  const resetRoomConfigurationState = () => {
    setRoomAmenities([]);
    setRoomFeatures({
      non_smoking: false,
      pet_friendly: false,
      wheelchair_accessible: false
    });
    setRoomAvailability({
      total_rooms: 1,
      minimum_stay: 1
    });
  };

  // Initialize room configuration state when room type is selected
  const initializeRoomConfigurationState = (roomType) => {
    if (roomType) {
      setRoomAmenities(roomType.amenities || []);
      setRoomFeatures(roomType.features || {
        non_smoking: false,
        pet_friendly: false,
        wheelchair_accessible: false
      });
      setRoomAvailability(roomType.availability || {
        total_rooms: 1,
        minimum_stay: 1
      });
    }
  };

  // Persist selected room type configuration
  const handleSaveRoomConfiguration = async () => {
    console.log('Save Configuration button clicked!');
    console.log('selectedHotel:', selectedHotel);
    console.log('selectedRoomType:', selectedRoomType);
    
    if (!selectedHotel || !selectedRoomType) {
      console.log('Missing selectedHotel or selectedRoomType');
      setError('Please select a hotel and room type to configure.');
      return;
    }
    
    try {
      setError('');
      console.log('Saving room configuration for:', selectedRoomType.name);
      console.log('Amenities:', roomAmenities);
      console.log('Features:', roomFeatures);
      console.log('Availability:', roomAvailability);
      
      // Map UI room object to backend RoomType fields
      const payload = {
        name: selectedRoomType.name || '',
        category: selectedRoomType.category || 'standard',
        description: selectedRoomType.description || '',
        short_description: (selectedRoomType.description || '').slice(0, 240),
        bed_type: selectedRoomType.bed_type || 'double',
        bed_count: 1,
        max_occupancy: Math.max((selectedRoomType.max_adults || 2) + (selectedRoomType.max_children || 0), 1),
        max_adults: selectedRoomType.max_adults || 2,
        max_children: selectedRoomType.max_children || 0,
        base_price: selectedRoomType.base_price || 0,
        currency: selectedRoomType.currency || 'USD',
        has_workspace: roomAmenities.includes('Work Desk'),
        has_shower: roomAmenities.includes('Shower'),
        has_bathtub: roomAmenities.includes('Bathtub'),
        has_kitchen: roomAmenities.includes('Kitchenette'),
        has_sea_view: roomAmenities.includes('Ocean View'),
        has_city_view: roomAmenities.includes('City View'),
        has_balcony: roomAmenities.includes('Balcony'),
        is_active: true,
      };

      console.log('Payload being sent:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      // Create or update room type
      let savedRoom;
      if (selectedRoomType.id) {
        savedRoom = await listingsAPI.updateRoomType(selectedRoomType.id, payload);
      } else {
        savedRoom = await listingsAPI.createRoomType(selectedHotel.id, payload);
      }

      console.log('Room saved successfully:', savedRoom);

      // Update local state with saved room id and preserve all data
      const updatedRoomTypes = selectedHotel.room_types.map((room) => {
        if (room === selectedRoomType) {
          return { 
            ...room, 
            id: savedRoom.id,
            amenities: roomAmenities,
            features: roomFeatures,
            availability: roomAvailability
          };
        }
        return room;
      });
      
      setSelectedHotel({ ...selectedHotel, room_types: updatedRoomTypes });
      setSelectedRoomType({ 
        ...selectedRoomType, 
        id: savedRoom.id,
        amenities: roomAmenities,
        features: roomFeatures,
        availability: roomAvailability
      });

      setSuccess('Room configuration saved successfully! Hotel is pending approval.');
      
      // Close the room management modal and redirect to My Hotel page
      setTimeout(() => {
        setShowRoomManagementModal(false);
        setSelectedHotel(null);
        setSelectedRoomType(null);
        // The hotel should now appear in the My Hotel page with Pending Approval status
      }, 1500); // Small delay to show success message
      
    } catch (e) {
      console.error('Failed saving room configuration', e);
      console.error('Error details:', e.response?.data);
      
      if (e.response?.status === 400) {
        const errorData = e.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          setError(`Validation errors: ${fieldErrors}`);
        } else {
          setError(errorData || 'Please check all required fields and try again.');
        }
      } else {
        setError(e.response?.data?.detail || e.response?.data?.message || 'Failed to save configuration. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Hotel Host Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your hotels, bookings, and grow your business</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Enhanced Add Hotel Modal */}
      {showAddHotelModal && (
        <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Add New Hotel</h3>
                  <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 5</p>
                </div>
                <button 
                  onClick={() => {
                    setShowAddHotelModal(false);
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
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      step <= currentStep 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step}
                    </div>
                    {step < 5 && (
                      <div className={`w-8 h-0.5 mx-2 transition-all duration-200 ${
                        step < currentStep ? 'bg-red-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="px-8 py-6 flex-1 overflow-y-auto">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={newHotelData.phone}
                        onChange={(e) => setNewHotelData({...newHotelData, phone: e.target.value})}
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="hotel@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={newHotelData.website}
                      onChange={(e) => setNewHotelData({...newHotelData, website: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.yourhotel.com"
                    />
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
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
                      <div>
                        <span className="font-medium text-gray-700">Website:</span>
                        <p className="text-gray-900">{newHotelData.website || 'Not provided'}</p>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {newHotelData.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Hotel image ${index + 1}`}
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
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAddHotelModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                
                {currentStep < 5 ? (
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleAddHotel}
                    disabled={!canProceedToReview()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Hotel</h3>
              <button 
                onClick={() => {
                  setShowEditHotelModal(false);
                  setSelectedHotel(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                <input
                  type="text"
                  value={selectedHotel.name || ''}
                  onChange={(e) => setSelectedHotel({...selectedHotel, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter hotel name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={selectedHotel.description || ''}
                  onChange={(e) => setSelectedHotel({...selectedHotel, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Describe your hotel"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={selectedHotel.city || ''}
                    onChange={(e) => setSelectedHotel({...selectedHotel, city: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
                  <select
                    value={selectedHotel.star_rating || 3}
                    onChange={(e) => setSelectedHotel({...selectedHotel, star_rating: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value={1}>1 Star</option>
                    <option value={2}>2 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={5}>5 Stars</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={selectedHotel.address || ''}
                  onChange={(e) => setSelectedHotel({...selectedHotel, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Full address"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditHotelModal(false);
                    setSelectedHotel(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await listingsAPI.updateListing(selectedHotel.id, selectedHotel);
                      setSuccess('Hotel updated successfully!');
                      setShowEditHotelModal(false);
                      setSelectedHotel(null);
                      await loadDashboardData();
                    } catch (err) {
                      setError('Failed to update hotel. Please try again.');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Hotel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Management Modal */}
      {showRoomManagementModal && selectedHotel && (
        <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-4">
          {console.log('Room Management Modal is rendering')}
          {console.log('showRoomManagementModal:', showRoomManagementModal)}
          {console.log('selectedHotel in modal:', selectedHotel)}
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Hotel Management</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedHotel.name}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowRoomManagementModal(false);
                    setSelectedHotel(null);
                    setSelectedRoomType(null);
                    setRoomManagementView('overview');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Tab Navigation - Show only if hotel is configured */}
              {hotelConfigurationState.isConfigured && (
                <div className="flex space-x-1 border-b border-gray-200">
                  <button
                    onClick={() => setRoomManagementView('overview')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      roomManagementView === 'overview'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setRoomManagementView('rooms')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      roomManagementView === 'rooms'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Rooms ({selectedHotel.room_types?.length || 0})
                  </button>
                  <button
                    onClick={() => setRoomManagementView('analytics')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      roomManagementView === 'analytics'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setRoomManagementView('configure')}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      roomManagementView === 'configure'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Configure
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-8 py-6 flex-1 overflow-y-auto">
              {console.log('⚡ Render Debug:', { 
                roomManagementView, 
                isConfigured: hotelConfigurationState.isConfigured, 
                hasRoomTypes: hotelConfigurationState.hasRoomTypes,
                roomTypesCount: selectedHotel.room_types?.length 
              })}
              {/* Conditional content based on view */}
              {roomManagementView === 'overview' && hotelConfigurationState.isConfigured ? (
                // Overview Dashboard for Configured Hotels
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Room Types</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{selectedHotel.room_types?.length || 0}</p>
                        </div>
                        <BuildingOfficeIcon className="h-12 w-12 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Active Listings</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">{selectedHotel.room_types?.filter(r => r.is_active !== false).length || 0}</p>
                        </div>
                        <CheckCircleIcon className="h-12 w-12 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg. Price</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {selectedHotel.room_types?.length > 0 
                              ? (selectedHotel.room_types.reduce((sum, r) => sum + parseFloat(r.base_price || 0), 0) / selectedHotel.room_types.length).toFixed(0)
                              : 0}
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-12 w-12 text-purple-500" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setRoomManagementView('rooms')}
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <PlusIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Add New Room Type</p>
                          <p className="text-sm text-gray-600">Configure a new room for your hotel</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setRoomManagementView('analytics')}
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">View Analytics</p>
                          <p className="text-sm text-gray-600">Check performance and bookings</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Recent Room Types */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Room Types</h4>
                    <div className="space-y-3">
                      {selectedHotel.room_types?.slice(0, 3).map((room, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                              <p className="font-medium text-gray-900">{room.name}</p>
                              <p className="text-sm text-gray-600">{room.currency} {room.base_price}/night</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRoomType(room);
                              setRoomManagementView('configure');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedHotel.room_types?.length > 3 && (
                      <button
                        onClick={() => setRoomManagementView('rooms')}
                        className="w-full mt-4 py-2 text-center text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        View All Rooms ({selectedHotel.room_types.length})
                      </button>
                    )}
                  </div>
                </div>
              ) : roomManagementView === 'rooms' ? (
                // Room Management View
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-gray-900">Room Types</h4>
                    <button
                      onClick={() => {
                        setSelectedRoomType(null);
                        setRoomAmenities([]);
                        setRoomFeatures({ non_smoking: false, pet_friendly: false, wheelchair_accessible: false });
                        setRoomAvailability({ total_rooms: 1, minimum_stay: 1 });
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 inline mr-2" />
                      Add Room Type
                    </button>
                  </div>

                  {selectedHotel.room_types && selectedHotel.room_types.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedHotel.room_types.map((room, index) => (
                        <div 
                          key={index}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedRoomType === room 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedRoomType(room);
                            initializeRoomConfigurationState(room);
                            setRoomManagementView('configure');
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">{room.name || `Room Type ${index + 1}`}</h5>
                              <p className="text-sm text-gray-600 capitalize">{room.category}</p>
                              <p className="text-sm text-gray-500">{room.bed_type} • {room.max_adults} adults, {room.max_children} children</p>
                              <p className="text-sm font-medium text-gray-900">{room.currency} {room.base_price}/night</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No room types found</p>
                      <p className="text-sm">Add room types to get started</p>
                    </div>
                  )}
                </div>
              ) : roomManagementView === 'analytics' ? (
                // Analytics View
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-900">Analytics</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <p className="text-gray-700">Analytics dashboard coming soon</p>
                    <p className="text-sm text-gray-600 mt-2">Track bookings, revenue, and occupancy rates</p>
                  </div>
                </div>
              ) : (
                // Default: Configuration View (same as before)
                <>
                  {selectedHotel && selectedHotel.id && !hotelConfigurationState.isConfigured && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Hotel created successfully!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Now complete your setup by configuring images, amenities, and availability for each room type.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Room Types List */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Room Types</h4>
                  {console.log('Selected hotel in room management:', selectedHotel)}
                  {console.log('Room types in selected hotel:', selectedHotel.room_types)}
                  {selectedHotel.room_types && selectedHotel.room_types.length > 0 ? (
                    selectedHotel.room_types.map((room, index) => (
                      <div 
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedRoomType === room 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          console.log('Room type clicked:', room);
                          setSelectedRoomType(room);
                          initializeRoomConfigurationState(room);
                          console.log('Room type set, selectedRoomType should be:', room);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-gray-900">{room.name || `Room Type ${index + 1}`}</h5>
                            <p className="text-sm text-gray-600 capitalize">{room.category}</p>
                            <p className="text-sm text-gray-500">{room.bed_type} • {room.max_adults} adults, {room.max_children} children</p>
                            <p className="text-sm font-medium text-gray-900">{room.currency} {room.base_price}/night</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500">Click to configure</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No room types found</p>
                      <p className="text-sm">Add room types when creating your hotel</p>
                    </div>
                  )}
                </div>

                {/* Room Configuration */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Room Configuration</h4>
                  {console.log('selectedRoomType in render:', selectedRoomType)}
                  {selectedRoomType ? (
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h5 className="font-medium text-gray-900 mb-4">{selectedRoomType.name}</h5>
                      
                      {/* Room Images */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Room Images</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Display existing images */}
                          {selectedRoomType.images && selectedRoomType.images.map((image, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <img
                                src={image}
                                alt={`${selectedRoomType.name} - ${imgIndex + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedRoomTypes = selectedHotel.room_types.map(room => {
                                    if (room === selectedRoomType) {
                                      return {
                                        ...room,
                                        images: room.images.filter((_, i) => i !== imgIndex)
                                      };
                                    }
                                    return room;
                                  });
                                  setSelectedHotel({
                                    ...selectedHotel,
                                    room_types: updatedRoomTypes
                                  });
                                  setSelectedRoomType({
                                    ...selectedRoomType,
                                    images: selectedRoomType.images.filter((_, i) => i !== imgIndex)
                                  });
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          
                          {/* Add Image Button */}
                          {(!selectedRoomType.images || selectedRoomType.images.length < 5) && (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                              <button
                                type="button"
                                onClick={() => {
                                  const fileInput = document.getElementById(`room-image-input-${selectedRoomType.name}`);
                                  fileInput.click();
                                }}
                                className="text-center w-full h-full flex flex-col items-center justify-center"
                              >
                                <PlusIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                                <span className="text-xs text-gray-600">Add Image</span>
                              </button>
                              <input
                                id={`room-image-input-${selectedRoomType.name}`}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files);
                                  const imageUrls = files.map(file => URL.createObjectURL(file));
                                  const updatedRoomTypes = selectedHotel.room_types.map(room => {
                                    if (room === selectedRoomType) {
                                      return {
                                        ...room,
                                        images: [...(room.images || []), ...imageUrls]
                                      };
                                    }
                                    return room;
                                  });
                                  setSelectedHotel({
                                    ...selectedHotel,
                                    room_types: updatedRoomTypes
                                  });
                                  setSelectedRoomType({
                                    ...selectedRoomType,
                                    images: [...(selectedRoomType.images || []), ...imageUrls]
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Upload high-quality images of this room type (max 5 images)</p>
                      </div>

                      {/* Room Amenities */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Room Amenities</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            'Air Conditioning', 'Wi-Fi', 'TV', 'Mini Bar', 'Safe', 'Balcony',
                            'Ocean View', 'City View', 'Kitchenette', 'Coffee Maker', 'Iron',
                            'Hair Dryer', 'Work Desk', 'Sofa', 'Bathtub', 'Shower', 'Refrigerator',
                            'Microwave', 'Room Service', 'Daily Housekeeping', 'Wake-up Service',
                            'Laundry Service', '24/7 Room Service', 'Private Bathroom'
                          ].map((amenity) => (
                            <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={roomAmenities.includes(amenity)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoomAmenities(prev => [...prev, amenity]);
                                  } else {
                                    setRoomAmenities(prev => prev.filter(a => a !== amenity));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{amenity}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Room Features */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Room Features</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={roomFeatures.non_smoking}
                              onChange={(e) => setRoomFeatures(prev => ({ ...prev, non_smoking: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Non-Smoking Room</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={roomFeatures.pet_friendly}
                              onChange={(e) => setRoomFeatures(prev => ({ ...prev, pet_friendly: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Pet Friendly</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={roomFeatures.wheelchair_accessible}
                              onChange={(e) => setRoomFeatures(prev => ({ ...prev, wheelchair_accessible: e.target.checked }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Wheelchair Accessible</span>
                          </label>
                        </div>
                      </div>

                      {/* Room Availability */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Room Availability</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Total Rooms Available</label>
                            <input
                              type="number"
                              min="1"
                              value={roomAvailability.total_rooms}
                              onChange={(e) => setRoomAvailability(prev => ({ ...prev, total_rooms: parseInt(e.target.value) || 1 }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Minimum Stay (nights)</label>
                            <input
                              type="number"
                              min="1"
                              value={roomAvailability.minimum_stay}
                              onChange={(e) => setRoomAvailability(prev => ({ ...prev, minimum_stay: parseInt(e.target.value) || 1 }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end">
                        <button onClick={handleSaveRoomConfiguration} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Save Configuration
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CogIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Select a room type to configure</p>
                      <p className="text-sm">Choose a room type from the list to add images, amenities, and availability settings</p>
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
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
                  <h3 className="text-xl font-bold text-gray-900">Edit Room Type</h3>
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
    </div>
  );
};

export default HotelHostDashboard;


