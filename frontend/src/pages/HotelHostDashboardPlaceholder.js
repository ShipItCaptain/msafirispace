import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI, listingsAPI, bookingsAPI, reviewsAPI } from '../services/api';
import { buildAmenityIndex, normalizeAmenityToken, resolveHotelAmenityName } from '../utils/hotelAmenities';
import {
  calculateHostStats,
  normalizeHostBooking,
  normalizeHostBookings,
  normalizeHostReviews,
} from './dashboard/hostDashboardUtils';
import { buildHostAnalytics, exportBookingsCsv, exportBookingsExcel } from './dashboard/hostDashboardAnalytics';
import HostDashboardBookingsTab from './dashboard/HostDashboardBookingsTab';
import HostDashboardOverviewTab from './dashboard/HostDashboardOverviewTab';
import HostDashboardHotelsTab from './dashboard/HostDashboardHotelsTab';
import HostDashboardManageRoomsTab from './dashboard/HostDashboardManageRoomsTab';
import HostDashboardModals from './dashboard/HostDashboardModals';
import HostDashboardAnalyticsTab from './dashboard/HostDashboardAnalyticsTab';
import HostDashboardReviewsTab from './dashboard/HostDashboardReviewsTab';
import HostDashboardSettingsTab from './dashboard/HostDashboardSettingsTab';
import PromotionsManager from './dashboard/PromotionsManager';
import {
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  StarIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  HomeIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';

const HotelHostDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hotelToDelete, setHotelToDelete] = useState(null);
  const [isDeletingHotel, setIsDeletingHotel] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState(null);
  const [bookingsLastUpdatedAt, setBookingsLastUpdatedAt] = useState(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [summaryRange, setSummaryRange] = useState('30d');
  const [summaryCustomFrom, setSummaryCustomFrom] = useState('');
  const [summaryCustomTo, setSummaryCustomTo] = useState('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingSortBy, setBookingSortBy] = useState('created_desc');
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingViewMode, setBookingViewMode] = useState('table');
  const [calendarMonthCursor, setCalendarMonthCursor] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [sectionLoading, setSectionLoading] = useState({
    overview: true,
    bookings: true,
  });
  const [bookingActivityLog, setBookingActivityLog] = useState({});
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({});
  const [reviewReplyLoadingId, setReviewReplyLoadingId] = useState(null);
  const [hostSettings, setHostSettings] = useState({
    company_name: '',
    email: '',
    phone_number: '',
    preferred_language: 'en',
    preferred_currency: 'KES',
    notification_preferences: {
      new_booking_notifications: true,
      review_notifications: true,
      marketing_emails: false,
    },
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hostSettingsBaseline, setHostSettingsBaseline] = useState(null);
  
  // Room configuration state
  const [roomAmenities, setRoomAmenities] = useState([]);
  const [roomFeatures, setRoomFeatures] = useState({
    non_smoking: false,
    pet_friendly: false,
    wheelchair_accessible: false
  });
  const [roomAvailability, setRoomAvailability] = useState({
    total_rooms: 1,
    maximum_stay: 30
  });
  const [currentStep, setCurrentStep] = useState(1);
  
  // Manage Rooms state
  const [allRoomTypes, setAllRoomTypes] = useState([]);
  const [selectedHotelForRooms, setSelectedHotelForRooms] = useState(null);
  const [roomSearchQuery] = useState('');
  const [roomFilterCategory] = useState('all');
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [expandedRoomConfig, setExpandedRoomConfig] = useState(null); // Track which room type is expanded for inline config
const [expandedRoomMode, setExpandedRoomMode] = useState('view'); // 'view' or 'edit'
  const [lastSavedRoomId, setLastSavedRoomId] = useState(null);
  
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
    check_in_time: '14:00',
    check_out_time: '11:00',
    maximum_nights: 30,
    cancellation_policy: 'moderate',
    
    // Amenities
    amenities: [],
    
    // Room Types
    room_types: [{
      name: '',
      description: '',
      category: '',
      bed_type: '',
      max_adults: 2,
      max_children: 1,
      base_price: '',
      currency: 'USD',
      images: [],
      basic_info_completed: false
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
  const [stepWarning, setStepWarning] = useState('');

  const mergeRoomsIntoHotels = useCallback((hotelRows, roomRows) => {
    const roomsByHotel = new Map();

    roomRows.forEach((room) => {
      const hotelId = room.hotel_id || (typeof room.hotel === 'object' ? room.hotel?.id : room.hotel);
      if (!hotelId) return;
      if (!roomsByHotel.has(hotelId)) {
        roomsByHotel.set(hotelId, []);
      }
      roomsByHotel.get(hotelId).push({
        ...room,
        hotel_id: hotelId,
      });
    });

    return hotelRows.map((hotel) => {
      const serverRooms = roomsByHotel.get(hotel.id) || [];
      const unsavedLocalRooms = (hotel.room_types || []).filter((room) => !room?.id);
      const mergedRoomMap = new Map();

      serverRooms.forEach((room) => {
        if (room.id) {
          mergedRoomMap.set(`id:${room.id}`, room);
        } else if (room.name) {
          mergedRoomMap.set(`name:${room.name.trim().toLowerCase()}`, room);
        }
      });

      unsavedLocalRooms.forEach((room, index) => {
        const key = room.name
          ? `name:${room.name.trim().toLowerCase()}`
          : `draft:${hotel.id}:${index}`;
        if (!mergedRoomMap.has(key)) {
          mergedRoomMap.set(key, room);
        }
      });

      return {
        ...hotel,
        room_types: Array.from(mergedRoomMap.values()),
        total_rooms: serverRooms.length || hotel.total_rooms || 0,
      };
    });
  }, []);


  const loadDashboardData = useCallback(async () => {
    setError('');
    setSectionLoading({ overview: true, bookings: true });
    
    try {
      console.log('🔍 Loading dashboard data...');
      console.log('Current user:', user);
      console.log('User ID:', user?.id);
      console.log('User type:', typeof user?.id);
      
      const summaryParams = {};
      if (summaryRange === 'custom') {
        if (summaryCustomFrom) summaryParams.date_from = summaryCustomFrom;
        if (summaryCustomTo) summaryParams.date_to = summaryCustomTo;
      } else {
        summaryParams.range = summaryRange;
      }

      // Load hotels, host bookings and host summary in parallel.
      const [hotelsResponse, bookingsResponse, summaryResponse, userDetailResponse] = await Promise.all([
        listingsAPI.getUserListings(),
        bookingsAPI.getHostBookings(),
        authAPI.getHostDashboardSummary(summaryParams),
        authAPI.getUserDetail(),
      ]);
      const allHotels = hotelsResponse?.results || hotelsResponse || [];
      
      // Client-side safety filter: ensure only hotels owned by current user are displayed
      // This is a safety measure in case backend filtering fails
      const userHotels = allHotels.filter(hotel => {
        // hotel.host can be an integer ID (from HotelListSerializer) or an object (from HotelSerializer)
        const hotelHostId = typeof hotel.host === 'object' ? hotel.host?.id : hotel.host;
        const currentUserId = user?.id;
        
        // Compare as strings to handle type mismatches
        return String(hotelHostId) === String(currentUserId);
      });
      
      const roomResponses = await Promise.all(
        userHotels.map(async (hotel) => {
          try {
            const roomTypesResponse = await listingsAPI.getHotelRoomTypes(hotel.id);
            const roomTypes = roomTypesResponse?.results || roomTypesResponse?.data || roomTypesResponse || [];
            return roomTypes.map((room) => ({
              ...room,
              hotel_name: hotel.name,
              hotel_id: hotel.id,
              hotel_location: `${hotel.city}, ${hotel.country}`,
            }));
          } catch (roomError) {
            console.log(`No room types for hotel ${hotel.name}`);
            return [];
          }
        })
      );

      const flattenedRooms = roomResponses.flat();
      const hydratedHotels = mergeRoomsIntoHotels(userHotels, flattenedRooms);

      console.log(`✅ Filtered hotels: ${userHotels.length} of ${allHotels.length} belong to current user (ID: ${user?.id})`);
      setHotels(hydratedHotels);
      setAllRoomTypes(flattenedRooms);

      const userBookings = normalizeHostBookings(bookingsResponse?.results || bookingsResponse || []);
      setBookings(userBookings);
      setBookingsLastUpdatedAt(new Date());
      if (userBookings.length) {
        const firstCheckIn = userBookings[0].check_in || userBookings[0].checkIn || '';
        if (firstCheckIn) {
          setSelectedCalendarDate(firstCheckIn);
          const parsed = new Date(firstCheckIn);
          if (!Number.isNaN(parsed.getTime())) {
            setCalendarMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
          }
        }
      }

      // Load reviews for user's hotels
      const allReviews = [];
      for (const hotel of hydratedHotels) {
        try {
          const reviewsResponse = await reviewsAPI.getHotelReviews(hotel.id);
          allReviews.push(...(reviewsResponse.results || []));
        } catch (err) {
          console.log(`No reviews for hotel ${hotel.id}`);
        }
      }
      const normalizedReviews = normalizeHostReviews(allReviews);
      setReviews(normalizedReviews);

      // Prefer server-side summary stats to reduce client-side data stitching.
      if (summaryResponse && typeof summaryResponse === 'object') {
        setStats({
          totalBookings: Number(summaryResponse.total_bookings || 0),
          monthlyRevenue: Number(summaryResponse.total_revenue || 0),
          averageRating: Number(summaryResponse.average_rating || 0),
          occupancyRate: Number(summaryResponse.occupancy_rate || 0),
          totalRooms: Number(summaryResponse.total_rooms || 0),
          availableRooms: Number(summaryResponse.available_rooms || 0),
          pendingBookings: Number(summaryResponse.pending_bookings || summaryResponse.pending_requests || 0),
          todayCheckIns: Number(summaryResponse.today_check_ins || 0),
          todayCheckOuts: Number(summaryResponse.today_check_outs || 0),
        });
      } else {
        setStats(calculateHostStats({
          hotels: hydratedHotels,
          bookings: userBookings,
          reviews: normalizedReviews,
        }));
      }

      if (userDetailResponse && typeof userDetailResponse === 'object') {
        const nextNotificationPrefs = {
          new_booking_notifications: true,
          review_notifications: true,
          marketing_emails: false,
          ...(userDetailResponse.notification_preferences || {}),
        };
        const nextSettings = {
          company_name: userDetailResponse.company_name || '',
          email: userDetailResponse.email || '',
          phone_number: userDetailResponse.phone_number || '',
          preferred_language: userDetailResponse.preferred_language || 'en',
          preferred_currency: userDetailResponse.preferred_currency || 'KES',
          notification_preferences: nextNotificationPrefs,
        };
        setHostSettings(nextSettings);
        setHostSettingsBaseline(nextSettings);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setSectionLoading({ overview: false, bookings: false });
    }
  }, [mergeRoomsIntoHotels, summaryCustomFrom, summaryCustomTo, summaryRange, user]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingSearchQuery, bookingSortBy, bookingStatusFilter]);

  const settingsDirty = useMemo(() => {
    if (!hostSettingsBaseline) return false;
    return JSON.stringify(hostSettings) !== JSON.stringify(hostSettingsBaseline);
  }, [hostSettings, hostSettingsBaseline]);

  const settingsValidationError = useMemo(() => {
    const phone = (hostSettings.phone_number || '').trim();
    if (phone && !/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      return 'Phone number format looks invalid. Use digits and optional +, spaces, -, ().';
    }
    const companyName = (hostSettings.company_name || '').trim();
    if (companyName.length > 120) {
      return 'Business name is too long (max 120 characters).';
    }
    return '';
  }, [hostSettings.company_name, hostSettings.phone_number]);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!settingsDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [settingsDirty]);

  const handleBookingStatusUpdate = async (bookingId, statusValue) => {
    try {
      setBookingActionLoadingId(bookingId);
      const previous = bookings.find((booking) => booking.id === bookingId);
      const updatedBookingResponse = await bookingsAPI.updateHostBookingStatus(bookingId, statusValue);
      const updatedBooking = normalizeHostBooking(updatedBookingResponse);

      let nextBookings = [];
      setBookings((prev) => {
        nextBookings = prev.map((booking) => (
          booking.id === bookingId ? updatedBooking : booking
        ));
        return nextBookings;
      });

      setSelectedBooking((prev) => (
        prev && prev.id === bookingId ? updatedBooking : prev
      ));
      setBookingsLastUpdatedAt(new Date());
      setStats(calculateHostStats({
        hotels,
        bookings: nextBookings.length ? nextBookings : bookings,
        reviews,
      }));
      setBookingActivityLog((prev) => ({
        ...prev,
        [bookingId]: {
          from: previous?.status || null,
          to: statusValue,
          by: user?.email || user?.first_name || 'Host',
          at: new Date().toISOString(),
        },
      }));
      setSuccess(`Booking ${statusValue} successfully.`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update booking status.');
    } finally {
      setBookingActionLoadingId(null);
    }
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
        
        check_in_time: newHotelData.check_in_time || '14:00:00',
        check_out_time: newHotelData.check_out_time || '11:00:00',
        maximum_nights: Number(newHotelData.maximum_nights || 30),
        // Note: host will be set automatically by the backend
      };
      
      console.log('Sending hotel data:', hotelData);
      console.log('Current user ID for host assignment:', user?.id);
      
      const createdHotel = await listingsAPI.createListing(hotelData);
      console.log('✅ Hotel created successfully:', createdHotel.name);
      console.log('Hotel ID:', createdHotel.id, 'Host ID:', createdHotel.host);
      console.log('Host ID type:', typeof createdHotel.host, 'User ID type:', typeof user?.id);
      console.log('Host matches user:', String(createdHotel.host) === String(user?.id));
      
      if (createdHotel) {
        // Upload hotel images (if any) and map amenities
        try {
          const hotelId = createdHotel.id;
          const imagesToUpload = (newHotelData.images || []).filter((img) => img?.file);
          if (imagesToUpload.length) {
            const imageUploads = imagesToUpload.map((img, index) => (
              listingsAPI.uploadHotelImage(hotelId, {
                file: img.file,
                image_type: img.image_type || 'exterior',
                is_primary: Boolean(img.is_primary),
                order: index,
                caption: img.caption || '',
              })
            ));
            await Promise.all(imageUploads);
          }

          const selectedAmenities = (newHotelData.amenities || [])
            .map(resolveHotelAmenityName)
            .filter(Boolean);
          if (selectedAmenities.length) {
            const amenityResponse = await listingsAPI.getHotelAmenities();
            const amenityRows = amenityResponse?.results || amenityResponse || [];
            const amenityIndex = buildAmenityIndex(amenityRows);
            const amenityUploads = selectedAmenities
              .map((name) => amenityIndex.get(normalizeAmenityToken(name)))
              .filter(Boolean)
              .map((amenityId) => listingsAPI.addHotelAmenity(hotelId, amenityId));
            if (amenityUploads.length) {
              await Promise.all(amenityUploads);
            }
          }
        } catch (assetError) {
          console.error('Error uploading hotel assets:', assetError);
        }

        // Verify hotel belongs to current user before adding (safety check)
        const hotelHostId = typeof createdHotel.host === 'object' ? createdHotel.host?.id : createdHotel.host;
        const currentUserId = user?.id;
        
        if (String(hotelHostId) !== String(currentUserId)) {
          console.warn('⚠️ Created hotel does not belong to current user! Not adding to list.');
          setError('Hotel was created but does not belong to current user. Please refresh the page.');
          return;
        }
        
        // Persist room types immediately so they survive refreshes
        const roomTypesToCreate = (newHotelData.room_types || []).filter(room =>
          room.name?.trim() && Number(room.base_price) > 0
        );
        let savedRoomTypes = [];
        let failedRoomTypes = [];
        if (roomTypesToCreate.length) {
          const results = await Promise.allSettled(roomTypesToCreate.map(async (room) => {
            const maxAdults = Number(room.max_adults || 2);
            const maxChildren = Number(room.max_children || 0);
            const description = (room.description || room.name || '').toString();
            const payload = {
              name: room.name.trim(),
              category: room.category || 'standard',
              description,
              short_description: description.slice(0, 240),
              bed_type: room.bed_type || 'double',
              bed_count: Number(room.bed_count || 1),
              max_occupancy: Math.max(maxAdults + maxChildren, 1),
              max_adults: maxAdults,
              max_children: maxChildren,
              base_price: Number(room.base_price || 0),
              currency: room.currency || 'USD',
              is_active: true,
              is_available: true,
            };
            const savedRoom = await listingsAPI.createRoomType(createdHotel.id, payload);
            return { room, savedRoom };
          }));

          results.forEach((result, idx) => {
            const originalRoom = roomTypesToCreate[idx];
            if (result.status === 'fulfilled') {
              const { savedRoom } = result.value;
              savedRoomTypes.push({
                ...originalRoom,
                ...savedRoom,
                id: savedRoom.id,
                basic_info_completed: true,
                configuration_completed: false,
                room_save_error: null,
              });
            } else {
              const errorMessage =
                result.reason?.response?.data?.detail ||
                result.reason?.message ||
                'Room type could not be saved. Please review the fields and try again.';
              failedRoomTypes.push({
                ...originalRoom,
                id: null,
                basic_info_completed: false,
                room_save_error: errorMessage,
              });
            }
          });
        }

        if (failedRoomTypes.length) {
          setError('Some room types could not be saved. Please open them and fix the errors to continue.');
        }

        // Add room types to the created hotel object
        const hotelWithRoomTypes = {
          ...createdHotel,
          room_types: [...savedRoomTypes, ...failedRoomTypes]
        };
        
        console.log('Room types being added:', newHotelData.room_types);
        console.log('Hotel with room types:', hotelWithRoomTypes);
        
        setHotels(prev => [...prev, hotelWithRoomTypes]);
        setShowAddHotelModal(false);
        resetForm();
        setSuccess('Hotel added successfully! Now configure your room types.');
        
        // Redirect to Manage Rooms tab to configure room types for the new hotel
        setTimeout(() => {
          setSelectedHotelForRooms(createdHotel.id);
          setActiveTab('rooms');
          setSuccess('Hotel added successfully! Configure your room types below.');
          // Reload room types to show the newly created hotel
          loadRoomTypes();
        }, 1000);
        
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

  const validateStep = (step) => {
    const missing = [];
    if (step === 1) {
      if (!newHotelData.name?.trim()) missing.push('Hotel name');
      if (!newHotelData.description?.trim()) missing.push('Hotel description');
      if (!newHotelData.star_rating || newHotelData.star_rating < 1 || newHotelData.star_rating > 5) {
        missing.push('Star rating');
      }
    }
    if (step === 2) {
      if (!newHotelData.address?.trim()) missing.push('Hotel address');
      if (!newHotelData.city?.trim()) missing.push('City');
      if (!newHotelData.check_in_time) missing.push('Check-in time');
      if (!newHotelData.check_out_time) missing.push('Check-out time');
      if (!newHotelData.maximum_nights || Number(newHotelData.maximum_nights) < 1) {
        missing.push('Maximum nights');
      }
      if (newHotelData.email?.trim() && !isValidEmail(newHotelData.email.trim())) {
        missing.push('Valid email');
      }
    }
    if (step === 4) {
      if (!newHotelData.room_types || newHotelData.room_types.length === 0) {
        missing.push('At least one room type');
      } else {
        const validRooms = newHotelData.room_types.filter(room =>
          room.name?.trim() && Number(room.base_price) > 0
        );
        if (validRooms.length === 0) {
          missing.push('Room type name and price');
        }
      }
    }
    return {
      isValid: missing.length === 0,
      missing,
    };
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (!validation.isValid) {
      setStepWarning(`Missing required info: ${validation.missing.join(', ')}`);
      return;
    }
    setStepWarning('');
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setStepWarning('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Helper functions for validation
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
    if (!newHotelData.check_in_time) {
      errors.push('Check-in time is required');
    }
    if (!newHotelData.check_out_time) {
      errors.push('Check-out time is required');
    }
    if (!newHotelData.maximum_nights || Number(newHotelData.maximum_nights) < 1) {
      errors.push('Maximum nights is required');
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
      check_in_time: '14:00',
      check_out_time: '11:00',
      maximum_nights: 30,
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
    setStepWarning('');
  };


  const handleDeleteHotel = async () => {
    if (!hotelToDelete) return;

    setError('');
    
    try {
      setIsDeletingHotel(true);
      await listingsAPI.deleteListing(hotelToDelete);
      setHotels(prev => prev.filter(hotel => hotel.id !== hotelToDelete));
      setSuccess('Hotel deleted successfully!');
      setHotelToDelete(null);
      
      // Reload data to get updated stats
      await loadDashboardData();
      
    } catch (err) {
      console.error('Error deleting hotel:', err);
      setError('Failed to delete hotel. Please try again.');
    } finally {
      setIsDeletingHotel(false);
    }
  };


  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'hotels', name: 'My Hotels', icon: BuildingOfficeIcon },
    { id: 'rooms', name: 'Manage Rooms', icon: HomeIcon },
    { id: 'bookings', name: 'Bookings', icon: CalendarIcon },
    { id: 'promotions', name: 'Promotions', icon: MegaphoneIcon },
    { id: 'analytics', name: 'Analytics', icon: ArrowTrendingUpIcon },
    { id: 'reviews', name: 'Reviews', icon: StarIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon }
  ];

  const bookingStatusCounts = {
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    awaiting_approval: bookings.filter((booking) => booking.needsApproval).length,
    awaiting_payment: bookings.filter((booking) => booking.needsPayment).length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
  };

  const timeAgo = (value) => {
    if (!value) return 'just now';
    const then = new Date(value);
    const deltaMinutes = Math.max(Math.floor((Date.now() - then.getTime()) / 60000), 0);
    if (deltaMinutes < 1) return 'just now';
    if (deltaMinutes < 60) return `${deltaMinutes} min ago`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours}h ago`;
    return `${Math.floor(deltaHours / 24)}d ago`;
  };

  const filteredBookings = useMemo(() => {
    const statusFiltered = bookings.filter((booking) => (
      bookingStatusFilter === 'all'
      || (bookingStatusFilter === 'awaiting_approval' && booking.needsApproval)
      || (bookingStatusFilter === 'awaiting_payment' && booking.needsPayment)
      || booking.status === bookingStatusFilter
    ));

    const query = bookingSearchQuery.trim().toLowerCase();
    const searched = query
      ? statusFiltered.filter((booking) => (
          `${booking.guest_name || ''} ${booking.hotel_name || ''} ${booking.room_name || ''}`.toLowerCase().includes(query)
        ))
      : statusFiltered;

    const sorted = [...searched].sort((a, b) => {
      if (bookingSortBy === 'check_in_asc') {
        return (a.check_in || '').localeCompare(b.check_in || '');
      }
      if (bookingSortBy === 'check_in_desc') {
        return (b.check_in || '').localeCompare(a.check_in || '');
      }
      if (bookingSortBy === 'amount_desc') {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (bookingSortBy === 'amount_asc') {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      if (bookingSortBy === 'created_asc') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return sorted;
  }, [bookingSearchQuery, bookingSortBy, bookingStatusFilter, bookings]);

  const bookingsPageSize = 10;
  const totalBookingPages = Math.max(Math.ceil(filteredBookings.length / bookingsPageSize), 1);
  const currentBookingPage = Math.min(bookingPage, totalBookingPages);
  const paginatedBookings = filteredBookings.slice(
    (currentBookingPage - 1) * bookingsPageSize,
    currentBookingPage * bookingsPageSize
  );

  const calendarBookingsByDate = useMemo(() => (
    filteredBookings.reduce((acc, booking) => {
      const key = booking.check_in || booking.checkIn || '';
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {})
  ), [filteredBookings]);

  const calendarGridDays = useMemo(() => {
    const year = calendarMonthCursor.getFullYear();
    const month = calendarMonthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOfGrid = new Date(firstDayOfMonth);
    startOfGrid.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startOfGrid);
      date.setDate(startOfGrid.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return {
        iso,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month,
        bookings: calendarBookingsByDate[iso] || [],
      };
    });
  }, [calendarBookingsByDate, calendarMonthCursor]);

  const selectedCalendarBookings = useMemo(() => (
    selectedCalendarDate ? (calendarBookingsByDate[selectedCalendarDate] || []) : []
  ), [calendarBookingsByDate, selectedCalendarDate]);

  const exportFilteredBookingsCsv = () => {
    exportBookingsCsv(filteredBookings, {
      summaryRange,
      summaryCustomFrom,
      summaryCustomTo,
    });
  };

  const exportFilteredBookingsExcel = () => {
    exportBookingsExcel(filteredBookings, {
      summaryRange,
      summaryCustomFrom,
      summaryCustomTo,
    });
  };

  const alertCards = [
    {
      id: 'awaiting-approval',
      label: 'Awaiting approval',
      value: bookingStatusCounts.awaiting_approval,
      className: 'bg-blue-50 border-blue-200 text-blue-900',
      actionLabel: 'Review',
      onAction: () => {
        setActiveTab('bookings');
        setBookingStatusFilter('awaiting_approval');
      },
    },
    {
      id: 'awaiting-payment',
      label: 'Awaiting payment',
      value: bookingStatusCounts.awaiting_payment,
      className: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      actionLabel: 'Review',
      onAction: () => {
        setActiveTab('bookings');
        setBookingStatusFilter('awaiting_payment');
      },
    },
    {
      id: 'checkins',
      label: 'Today check-ins',
      value: stats.todayCheckIns,
      className: 'bg-blue-50 border-blue-200 text-blue-900',
      actionLabel: 'View',
      onAction: () => setActiveTab('bookings'),
    },
    {
      id: 'checkouts',
      label: 'Today check-outs',
      value: stats.todayCheckOuts,
      className: 'bg-green-50 border-green-200 text-green-900',
      actionLabel: 'View',
      onAction: () => setActiveTab('bookings'),
    },
    {
      id: 'missing-rooms',
      label: 'Hotels without room types',
      value: hotels.filter((hotel) => !(hotel.room_types || []).length).length,
      className: 'bg-red-50 border-red-200 text-red-900',
      actionLabel: 'Fix now',
      onAction: () => setActiveTab('rooms'),
    },
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

  const analyticsData = useMemo(() => buildHostAnalytics(bookings), [bookings]);

  const updateHostSettingField = (field, value) => {
    setHostSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateNotificationPreference = (field, value) => {
    setHostSettings((prev) => ({
      ...prev,
      notification_preferences: {
        ...(prev.notification_preferences || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    if (settingsValidationError) {
      setError(settingsValidationError);
      return;
    }
    if (!settingsDirty) {
      setSuccess('No changes to save.');
      return;
    }
    try {
      setIsSavingSettings(true);
      setError('');
      const payload = {
        company_name: hostSettings.company_name,
        phone_number: hostSettings.phone_number,
        preferred_language: hostSettings.preferred_language,
        preferred_currency: hostSettings.preferred_currency,
        notification_preferences: hostSettings.notification_preferences,
      };
      const updatedUser = await authAPI.updateUserDetail(payload);
      const nextSettings = {
        ...hostSettings,
        company_name: updatedUser.company_name || '',
        phone_number: updatedUser.phone_number || '',
        preferred_language: updatedUser.preferred_language || 'en',
        preferred_currency: updatedUser.preferred_currency || 'KES',
        notification_preferences: {
          ...hostSettings.notification_preferences,
          ...(updatedUser.notification_preferences || {}),
        },
      };
      setHostSettings(nextSettings);
      setHostSettingsBaseline(nextSettings);
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleReviewReplyChange = (reviewId, value) => {
    setReviewReplyDrafts((prev) => ({
      ...prev,
      [reviewId]: value,
    }));
  };

  const handleSubmitReviewReply = async (review) => {
    const draft = (reviewReplyDrafts[review.id] ?? review.host_reply ?? '').trim();
    if (!draft) {
      setError('Reply cannot be empty.');
      return;
    }
    if (draft.length > 500) {
      setError('Reply is too long. Keep it under 500 characters.');
      return;
    }
    const previousReviews = reviews;
    const optimisticReview = {
      ...review,
      host_reply: draft,
      host_reply_updated_at: new Date().toISOString(),
    };
    try {
      setReviewReplyLoadingId(review.id);
      setError('');
      setReviews((prev) => prev.map((item) => (
        item.id === review.id
          ? normalizeHostReviews([optimisticReview])[0]
          : item
      )));
      const updated = await reviewsAPI.replyToReview(review.id, draft);
      setReviews((prev) => prev.map((item) => (
        item.id === review.id
          ? normalizeHostReviews([updated])[0]
          : item
      )));
      setReviewReplyDrafts((prev) => ({
        ...prev,
        [review.id]: updated.host_reply || draft,
      }));
      setSuccess('Reply saved.');
    } catch (err) {
      setReviews(previousReviews);
      setError(err?.response?.data?.detail || 'Failed to save reply.');
    } finally {
      setReviewReplyLoadingId(null);
    }
  };

  const getReplyMetadataLabel = (review) => {
    if (!review.host_reply_updated_at) return 'just now';
    const stamp = new Date(review.host_reply_updated_at);
    if (Number.isNaN(stamp.getTime())) return 'updated';
    return `updated ${stamp.toLocaleDateString()} ${stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleOpenHotelRoomsFromCard = async (hotelId) => {
    setSelectedHotelForRooms(hotelId);
    setActiveTab('rooms');
    await loadRoomTypes();
    setExpandedRoomConfig(null);
    setSelectedRoomType(null);
  };

  const handleManageHotelRooms = async (hotelId) => {
    setSelectedHotelForRooms(hotelId);
    setActiveTab('rooms');
    await loadRoomTypes();
  };

  const handleEditHotel = (hotel) => {
    setSelectedHotel(hotel);
    setShowEditHotelModal(true);
  };



  const renderOverview = () => (
    <HostDashboardOverviewTab
      error={error}
      success={success}
      setError={setError}
      setSuccess={setSuccess}
      sectionLoading={sectionLoading}
      setSummaryRange={setSummaryRange}
      summaryRange={summaryRange}
      summaryCustomFrom={summaryCustomFrom}
      setSummaryCustomFrom={setSummaryCustomFrom}
      summaryCustomTo={summaryCustomTo}
      setSummaryCustomTo={setSummaryCustomTo}
      stats={stats}
      reviews={reviews}
      formatCurrency={formatCurrency}
      alertCards={alertCards}
      approvalAlertCount={bookingStatusCounts.awaiting_approval}
      onReviewApprovalRequests={() => {
        setActiveTab('bookings');
        setBookingStatusFilter('awaiting_approval');
      }}
      setShowAddHotelModal={setShowAddHotelModal}
      setActiveTab={setActiveTab}
      bookingsLastUpdatedAt={bookingsLastUpdatedAt}
      setBookingStatusFilter={setBookingStatusFilter}
      bookingStatusFilter={bookingStatusFilter}
      bookingStatusCounts={bookingStatusCounts}
      filteredBookings={filteredBookings}
      timeAgo={timeAgo}
      getStatusColor={getStatusColor}
      bookingActionLoadingId={bookingActionLoadingId}
      setSelectedBooking={setSelectedBooking}
      handleBookingStatusUpdate={handleBookingStatusUpdate}
    />
  );

  const renderHotels = () => (
    <HostDashboardHotelsTab
      hotels={hotels}
      onAddHotel={() => setShowAddHotelModal(true)}
      onOpenHotelRooms={handleOpenHotelRoomsFromCard}
      onManageHotelRooms={handleManageHotelRooms}
      onManageMedia={() => navigate('/host/hotel/manage')}
      onEditHotel={handleEditHotel}
      onDeleteHotel={setHotelToDelete}
    />
  );

  const renderBookings = () => (
    <HostDashboardBookingsTab
      bookingViewMode={bookingViewMode}
      setBookingViewMode={setBookingViewMode}
      exportFilteredBookingsCsv={exportFilteredBookingsCsv}
      exportFilteredBookingsExcel={exportFilteredBookingsExcel}
      bookingStatusFilter={bookingStatusFilter}
      setBookingStatusFilter={setBookingStatusFilter}
      bookingStatusCounts={bookingStatusCounts}
      bookingSearchQuery={bookingSearchQuery}
      setBookingSearchQuery={setBookingSearchQuery}
      bookingSortBy={bookingSortBy}
      setBookingSortBy={setBookingSortBy}
      currentBookingPage={currentBookingPage}
      totalBookingPages={totalBookingPages}
      setBookingPage={setBookingPage}
      sectionLoading={sectionLoading}
      calendarMonthCursor={calendarMonthCursor}
      setCalendarMonthCursor={setCalendarMonthCursor}
      calendarGridDays={calendarGridDays}
      selectedCalendarDate={selectedCalendarDate}
      setSelectedCalendarDate={setSelectedCalendarDate}
      selectedCalendarBookings={selectedCalendarBookings}
      bookingActionLoadingId={bookingActionLoadingId}
      setSelectedBooking={setSelectedBooking}
      handleBookingStatusUpdate={handleBookingStatusUpdate}
      paginatedBookings={paginatedBookings}
      filteredBookings={filteredBookings}
      getStatusColor={getStatusColor}
      formatCurrency={formatCurrency}
    />
  );

  const renderAnalytics = () => (
    <HostDashboardAnalyticsTab
      analyticsData={analyticsData}
      bookingsCount={bookings.length}
      formatCurrency={formatCurrency}
    />
  );

  const renderReviews = () => (
    <HostDashboardReviewsTab
      reviews={reviews}
      reviewReplyDrafts={reviewReplyDrafts}
      reviewReplyLoadingId={reviewReplyLoadingId}
      onReviewReplyChange={handleReviewReplyChange}
      onSubmitReviewReply={handleSubmitReviewReply}
      getReplyMetadataLabel={getReplyMetadataLabel}
    />
  );

  const loadRoomTypes = useCallback(async () => {
    try {
      console.log('Loading room types for all hotels...');
      
      // Load only user's hotels (server-side filtered)
      const hotelsResponse = await listingsAPI.getUserListings();
      const allHotels = hotelsResponse?.results || hotelsResponse || [];
      
      // Client-side safety filter: ensure only hotels owned by current user
      const userHotels = allHotels.filter(hotel => {
        const hotelHostId = typeof hotel.host === 'object' ? hotel.host?.id : hotel.host;
        const currentUserId = user?.id;
        return String(hotelHostId) === String(currentUserId);
      });
      
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
      
      // Deduplicate room types by ID (in case of duplicates from API)
      const uniqueRooms = [];
      const seenIds = new Set();
      const seenNamesByHotel = new Map(); // Track names per hotel to catch duplicates
      
      allRooms.forEach(room => {
        const hotelId = room.hotel_id;
        if (!seenNamesByHotel.has(hotelId)) {
          seenNamesByHotel.set(hotelId, new Set());
        }
        const hotelNames = seenNamesByHotel.get(hotelId);
        
        // If room has an ID, use that for deduplication
        if (room.id) {
          if (!seenIds.has(room.id)) {
            seenIds.add(room.id);
            uniqueRooms.push(room);
            // Also track the name for this hotel
            if (room.name) {
              hotelNames.add(room.name.trim().toLowerCase());
            }
          }
        } else {
          // For rooms without ID, check by name within the same hotel
          const roomName = room.name?.trim().toLowerCase();
          if (roomName && !hotelNames.has(roomName)) {
            hotelNames.add(roomName);
            uniqueRooms.push(room);
          } else if (!roomName) {
            // Room without name or ID - include it (shouldn't happen, but be safe)
            uniqueRooms.push(room);
          }
        }
      });
      
      console.log(`Deduplicated room types: ${allRooms.length} -> ${uniqueRooms.length}`);
      setAllRoomTypes(uniqueRooms);
      setHotels((prevHotels) => {
        const hotelsWithDraftRooms = userHotels.map((hotel) => {
          const existingHotel = prevHotels.find((item) => item.id === hotel.id);
          return existingHotel
            ? { ...hotel, room_types: existingHotel.room_types || [] }
            : hotel;
        });
        return mergeRoomsIntoHotels(hotelsWithDraftRooms, uniqueRooms);
      });
      return uniqueRooms;
    } catch (err) {
      console.error('Error loading room types:', err);
      setError('Failed to load room types. Please try again.');
      return [];
    }
  }, [mergeRoomsIntoHotels, user?.id]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      loadRoomTypes();
    }
  }, [activeTab, loadRoomTypes]);

  useEffect(() => {
    const state = location.state || {};
    const targetHotelId = Number(state.selectedHotelForRooms || 0);

    if (!state.initialTab && !targetHotelId && !state.successMessage) {
      return;
    }

    if (state.initialTab) {
      setActiveTab(state.initialTab);
    }

    if (targetHotelId) {
      setSelectedHotelForRooms(targetHotelId);
    }

    if (state.successMessage) {
      setSuccess(state.successMessage);
    }

    if (state.initialTab === 'rooms' || targetHotelId) {
      loadRoomTypes();
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [loadRoomTypes, location.pathname, location.state, navigate]);

  const renderManageRooms = () => (
    <HostDashboardManageRoomsTab
      hotels={hotels}
      allRoomTypes={allRoomTypes}
      selectedHotelForRooms={selectedHotelForRooms}
      roomSearchQuery={roomSearchQuery}
      roomFilterCategory={roomFilterCategory}
      setHotels={setHotels}
      setSelectedHotel={setSelectedHotel}
      selectedRoomType={selectedRoomType}
      setSelectedRoomType={setSelectedRoomType}
      initializeRoomConfigurationState={initializeRoomConfigurationState}
      loadRoomTypes={loadRoomTypes}
      expandedRoomConfig={expandedRoomConfig}
      setExpandedRoomConfig={setExpandedRoomConfig}
      expandedRoomMode={expandedRoomMode}
      setExpandedRoomMode={setExpandedRoomMode}
      navigate={navigate}
      formatCurrency={formatCurrency}
      roomAmenities={roomAmenities}
      setRoomAmenities={setRoomAmenities}
      roomFeatures={roomFeatures}
      setRoomFeatures={setRoomFeatures}
      roomAvailability={roomAvailability}
      setRoomAvailability={setRoomAvailability}
      handleSaveRoomConfiguration={handleSaveRoomConfiguration}
      lastSavedRoomId={lastSavedRoomId}
      setAllRoomTypes={setAllRoomTypes}
      setError={setError}
      setSuccess={setSuccess}
      setActiveTab={setActiveTab}
      setSelectedHotelForRooms={setSelectedHotelForRooms}
    />
  );

  const renderSettings = () => (
    <HostDashboardSettingsTab
      hostSettings={hostSettings}
      updateHostSettingField={updateHostSettingField}
      updateNotificationPreference={updateNotificationPreference}
      handleSaveSettings={handleSaveSettings}
      isSavingSettings={isSavingSettings}
      settingsDirty={settingsDirty}
      settingsValidationError={settingsValidationError}
    />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'hotels': return renderHotels();
      case 'rooms': return renderManageRooms();
      case 'bookings': return renderBookings();
      case 'promotions': return <PromotionsManager hotels={hotels} />;
      case 'analytics': return renderAnalytics();
      case 'reviews': return renderReviews();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
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
        maximum_stay: 30
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
      setLastSavedRoomId(savedRoom.id);

      // Upload images if there are any new images to upload
      // Check if selectedRoomType has images that need to be uploaded
      const imagesToUpload = selectedRoomType.images?.filter(img => {
        // Upload if it's a File object or has a file property
        if (img && typeof img === 'object' && img.file) {
          return true;
        }
        // Also check if it's a blob URL string (from old format) - we can't upload these, they're already lost
        return false;
      }) || [];

      if (imagesToUpload.length > 0 && savedRoom.id) {
        console.log(`Uploading ${imagesToUpload.length} images for room type ${savedRoom.id}`);
        
        try {
          const uploadPromises = imagesToUpload.map(async (img, index) => {
            try {
              const imageData = {
                file: img.file,
                image_type: img.image_type || 'main',
                caption: img.caption || '',
                is_primary: index === 0 && !imagesToUpload.some(i => i.is_primary), // First image is primary if none specified
                order: index
              };
              await listingsAPI.uploadRoomImage(savedRoom.id, imageData);
              console.log(`Image ${index + 1} uploaded successfully`);
            } catch (imgError) {
              console.error(`Failed to upload image ${index + 1}:`, imgError);
            }
          });
          
          await Promise.all(uploadPromises);
          console.log('All images uploaded successfully');
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          // Don't fail the entire save if image upload fails
        }
      }

      // Update local state with saved room - use ID comparison for reliability
      const roomIdToUpdate = selectedRoomType.id || savedRoom.id;
      const updatedRoomTypes = selectedHotel.room_types.map((room) => {
        const currentRoomId = room.id || (room === selectedRoomType ? selectedRoomType.id : null);
        if (currentRoomId === roomIdToUpdate || (!currentRoomId && room === selectedRoomType)) {
          return { 
            ...room, 
            ...savedRoom, // Use server response data to ensure consistency
            id: savedRoom.id,
            amenities: roomAmenities,
            features: roomFeatures,
            availability: roomAvailability,
            basic_info_completed: true,
            configuration_completed: true
          };
        }
        return room;
      });
      
      const selectedHotelUpdated = { ...selectedHotel, room_types: updatedRoomTypes };
      setSelectedHotel(selectedHotelUpdated);
      // Also update hotels array so render list does not keep the unsaved clone
      setHotels(prev => prev.map(h => h.id === selectedHotelUpdated.id ? selectedHotelUpdated : h));

      setSuccess(`Room configuration saved successfully for ${selectedRoomType.name}! You can now configure other room types.`);
      
      // Reload room types from the server and merge with any unsaved local room types
      try {
        const roomTypesResponse = await listingsAPI.getHotelRoomTypes(selectedHotel.id);
        const serverRoomTypes = roomTypesResponse.results || roomTypesResponse.data || roomTypesResponse || [];
        
        // Get IDs and names of room types from server (these have been saved)
        const savedRoomTypeNames = new Set(
          serverRoomTypes
            .map(rt => rt.name?.trim().toLowerCase())
            .filter(Boolean)
        );
        
        // Keep any local room types that haven't been saved yet (don't have IDs)
        // These are room types created during hotel creation but not yet configured/saved
        // But exclude any that match saved room types by name (to avoid duplicates)
        const unsavedLocalRoomTypes = (selectedHotel.room_types || []).filter(room => {
          // Only keep room types without IDs that:
          // 1. Aren't the one we just saved
          // 2. Don't have a name that matches any saved room type (to avoid duplicates)
          if (room.id) return false; // Skip saved room types
          if (room === selectedRoomType) return false; // Skip the one we just saved
          if (room.name && savedRoomTypeNames.has(room.name.trim().toLowerCase())) {
            // This unsaved room has the same name as a saved room - skip it to avoid duplicate
            return false;
          }
          return true;
        });
        
        // Merge server room types with unsaved local room types
        // Server room types come first (they're saved and authoritative)
        // Deduplicate by ID and name to prevent duplicates
        const mergedRoomTypesMap = new Map();
        
        // Add all server room types (saved ones) - these are authoritative
        serverRoomTypes.forEach(rt => {
          if (rt.id) {
            mergedRoomTypesMap.set(rt.id, rt);
          } else if (rt.name) {
            const key = `name:${rt.name.trim().toLowerCase()}`;
            if (!mergedRoomTypesMap.has(key)) {
              mergedRoomTypesMap.set(key, rt);
            }
          }
        });
        
        // Add unsaved local room types, but skip any that match saved ones by name
        unsavedLocalRoomTypes.forEach(rt => {
          if (rt.id) {
            // Has ID - use ID as key (shouldn't happen for unsaved, but be safe)
            if (!mergedRoomTypesMap.has(rt.id)) {
              mergedRoomTypesMap.set(rt.id, rt);
            }
          } else if (rt.name) {
            const nameKey = rt.name.trim().toLowerCase();
            // Only add if no saved room with this name exists
            if (!savedRoomTypeNames.has(nameKey)) {
              const key = `name:${nameKey}`;
              if (!mergedRoomTypesMap.has(key)) {
                mergedRoomTypesMap.set(key, rt);
              }
            }
          }
        });
        
        const mergedRoomTypes = Array.from(mergedRoomTypesMap.values());
        
        console.log('Merged room types (deduplicated):', {
          serverCount: serverRoomTypes.length,
          unsavedCount: unsavedLocalRoomTypes.length,
          totalCount: mergedRoomTypes.length,
          duplicatesRemoved: (serverRoomTypes.length + unsavedLocalRoomTypes.length) - mergedRoomTypes.length
        });
        
        const updatedHotel = {
          ...selectedHotel,
          room_types: mergedRoomTypes
        };
        setSelectedHotel(updatedHotel);
        setHotels(prev => prev.map(h => h.id === updatedHotel.id ? updatedHotel : h));
        
        // Update selectedRoomType with the server response if it still matches
        const updatedRoomType = serverRoomTypes.find(rt => rt.id === savedRoom.id);
        if (updatedRoomType) {
          setSelectedRoomType({
            ...updatedRoomType,
            amenities: roomAmenities,
            features: roomFeatures,
            availability: roomAvailability,
            configuration_completed: true
          });
        }
      } catch (err) {
        console.error('Error reloading room types:', err);
        // If reload fails, still update with local data
        setSelectedRoomType({ 
          ...selectedRoomType, 
          ...savedRoom,
          id: savedRoom.id,
          amenities: roomAmenities,
          features: roomFeatures,
          availability: roomAvailability,
          configuration_completed: true
        });
      }
      
      // Clear selected room type and reset configuration state to allow configuring the next room
      setTimeout(() => {
        setLastSavedRoomId(null);
        setSelectedRoomType(null);
        setRoomAmenities([]);
        setRoomFeatures({
          non_smoking: false,
          pet_friendly: false,
          wheelchair_accessible: false
        });
        setRoomAvailability({
          total_rooms: 1,
          maximum_stay: 30
        });
        // Keep the modal open so user can configure more room types
      }, 2000); // Small delay to show success message
      
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
                const showApprovalBadge = tab.id === 'bookings' && bookingStatusCounts.awaiting_approval > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      // Landing on Manage Rooms directly (not via a specific
                      // hotel's card) with no hotel picked yet: skip the
                      // ambiguity entirely when there's only one to pick.
                      if (tab.id === 'rooms' && !selectedHotelForRooms && hotels.length === 1) {
                        setSelectedHotelForRooms(hotels[0].id);
                      }
                      setActiveTab(tab.id);
                    }}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                    {showApprovalBadge && (
                      <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {bookingStatusCounts.awaiting_approval}
                      </span>
                    )}
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

      <HostDashboardModals
        showAddHotelModal={showAddHotelModal}
        setShowAddHotelModal={setShowAddHotelModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        resetForm={resetForm}
        newHotelData={newHotelData}
        setNewHotelData={setNewHotelData}
        nextStep={nextStep}
        prevStep={prevStep}
        stepWarning={stepWarning}
        canProceedToReview={canProceedToReview}
        validateAllRequiredFields={validateAllRequiredFields}
        handleAddHotel={handleAddHotel}
        error={error}
        setError={setError}
        setSuccess={setSuccess}
        showEditHotelModal={showEditHotelModal}
        selectedHotel={selectedHotel}
        setSelectedHotel={setSelectedHotel}
        setShowEditHotelModal={setShowEditHotelModal}
        loadDashboardData={loadDashboardData}
        selectedRoomType={selectedRoomType}
        setSelectedRoomType={setSelectedRoomType}
        initializeRoomConfigurationState={initializeRoomConfigurationState}
        roomAmenities={roomAmenities}
        setRoomAmenities={setRoomAmenities}
        roomFeatures={roomFeatures}
        setRoomFeatures={setRoomFeatures}
        roomAvailability={roomAvailability}
        setRoomAvailability={setRoomAvailability}
        handleSaveRoomConfiguration={handleSaveRoomConfiguration}
        setAllRoomTypes={setAllRoomTypes}
        allRoomTypes={allRoomTypes}
        showEditRoomModal={showEditRoomModal}
        setShowEditRoomModal={setShowEditRoomModal}
        editingRoomType={editingRoomType}
        setEditingRoomType={setEditingRoomType}
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
        bookingActivityLog={bookingActivityLog}
        timeAgo={timeAgo}
        bookingActionLoadingId={bookingActionLoadingId}
        handleBookingStatusUpdate={handleBookingStatusUpdate}
        hotelToDelete={hotelToDelete}
        isDeletingHotel={isDeletingHotel}
        handleDeleteHotel={handleDeleteHotel}
        setHotelToDelete={setHotelToDelete}
        bookings={bookings}
      />
    </div>
  );
};

export default HotelHostDashboard;
