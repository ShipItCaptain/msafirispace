import axios from 'axios';

const REQUEST_ID_HEADER = 'X-Request-ID';

const generateRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getApiErrorDetails = (error, fallbackMessage = 'Request failed. Please try again.') => {
  const apiData = error?.response?.data;
  const requestId =
    error?.requestId ||
    error?.response?.headers?.['x-request-id'] ||
    apiData?.request_id ||
    null;

  let message = fallbackMessage;
  if (apiData?.detail) {
    message = apiData.detail;
  } else if (typeof apiData?.message === 'string') {
    message = apiData.message;
  } else if (apiData && typeof apiData === 'object') {
    const firstKey = Object.keys(apiData).find((key) => key !== 'request_id');
    if (firstKey) {
      const firstValue = apiData[firstKey];
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        message = firstValue[0];
      } else if (typeof firstValue === 'string') {
        message = firstValue;
      }
    }
  }

  return {
    message,
    requestId,
    fullMessage: requestId ? `${message} (Ref: ${requestId})` : message,
  };
};

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.headers[REQUEST_ID_HEADER]) {
      config.headers[REQUEST_ID_HEADER] = generateRequestId();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseRequestId = error?.response?.headers?.['x-request-id'];
    const sentRequestId = originalRequest?.headers?.[REQUEST_ID_HEADER];
    const bodyRequestId = error?.response?.data?.request_id;
    error.requestId = responseRequestId || bodyRequestId || sentRequestId || null;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },

  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout/');
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  // Get current user details with roles
  getMe: async () => {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.patch('/auth/profile/', profileData);
    return response.data;
  },

  // Role management
  addRole: async (roleData) => {
    const response = await api.post('/auth/roles/add/', roleData);
    return response.data;
  },

  switchRole: async (roleData) => {
    const response = await api.post('/auth/roles/switch/', roleData);
    return response.data;
  },

  removeRole: async (role) => {
    const response = await api.delete(`/auth/roles/${role}/remove/`);
    return response.data;
  },

  // Get user detail
  getUserDetail: async () => {
    const response = await api.get('/auth/detail/');
    return response.data;
  },

  // Update user detail
  updateUserDetail: async (userData) => {
    const response = await api.patch('/auth/detail/', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password/', passwordData);
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await api.post('/auth/reset-password/', { email });
    return response.data;
  },

  // Confirm password reset
  confirmPasswordReset: async (resetData) => {
    const response = await api.post('/auth/reset-password/confirm/', resetData);
    return response.data;
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email/', { token });
    return response.data;
  },

  // Resend verification email
  resendVerification: async () => {
    const response = await api.post('/auth/resend-verification/');
    return response.data;
  },

  // Apply referral code
  applyReferral: async (referralCode) => {
    const response = await api.post('/auth/apply-referral/', { referral_code: referralCode });
    return response.data;
  },

  // Get the current user's referral code/link and who they've referred
  getReferralStats: async () => {
    const response = await api.get('/auth/referral-stats/');
    return response.data;
  },

  // Get user stats
  getUserStats: async () => {
    const response = await api.get('/auth/stats/');
    return response.data;
  },

  // Get user dashboard
  getUserDashboard: async () => {
    const response = await api.get('/auth/dashboard/');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh/', { refresh: refreshToken });
    return response.data;
  },

  // Host onboarding
  onboardHost: async (hostData) => {
    const response = await api.post('/auth/host/onboard/', hostData);
    return response.data;
  },

  // Host onboarding with files (multipart) -- Content-Type is deliberately
  // NOT set manually: axios needs to compute the multipart boundary itself,
  // which only happens if the header is left for it to fill in.
  onboardHostFormData: async (formData) => {
    const config = {
      transformRequest: [(data, headers) => {
        delete headers['Content-Type'];
        return data;
      }],
    };
    const response = await api.post('/auth/host/onboard/', formData, config);
    return response.data;
  },

  // Whether the current user has already completed host onboarding (KYC)
  getHostOnboardingStatus: async () => {
    const response = await api.get('/auth/host/onboarding-status/');
    return response.data;
  },

  // Get host dashboard
  getHostDashboard: async () => {
    const response = await api.get('/auth/host/dashboard/');
    return response.data;
  },

  // Get host dashboard summary (alias endpoint)
  getHostDashboardSummary: async (params = {}) => {
    const response = await api.get('/auth/host/dashboard/summary/', { params });
    return response.data;
  },

  // BnB host profile
  getBnBProfile: async () => {
    const response = await api.get('/auth/host/bnb/');
    return response.data;
  },

  updateBnBProfile: async (profileData) => {
    const response = await api.put('/auth/host/bnb/', profileData);
    return response.data;
  },

  // Hotel/Restaurant host profile
  getHotelRestaurantProfile: async () => {
    const response = await api.get('/auth/host/hotel-restaurant/');
    return response.data;
  },

  updateHotelRestaurantProfile: async (profileData) => {
    const response = await api.put('/auth/host/hotel-restaurant/', profileData);
    return response.data;
  },

  // Concierge profile removed
};

// Listings API
export const listingsAPI = {
  // Get all listings
  getListings: async (params = {}) => {
    const response = await api.get('/listings/hotels/', { params });
    return response.data;
  },

  // Get listing by ID
  getListing: async (id) => {
    const response = await api.get(`/listings/hotels/${id}/`);
    return response.data;
  },

  // Create listing
  createListing: async (listingData) => {
    const response = await api.post('/listings/hotels/', listingData);
    return response.data;
  },

  // Update listing
  updateListing: async (id, listingData) => {
    const response = await api.patch(`/listings/hotels/${id}/`, listingData);
    return response.data;
  },

  // Delete listing
  deleteListing: async (id) => {
    const response = await api.delete(`/listings/hotels/${id}/`);
    return response.data;
  },

  // Search listings
  searchListings: async (searchParams) => {
    const response = await api.get('/listings/hotels/search/', { params: searchParams });
    return response.data;
  },

  // Get user's listings
  getUserListings: async () => {
    const response = await api.get('/listings/my-listings/');
    return response.data;
  },

  // --- Added: Room Types API ---
  createRoomType: async (hotelId, roomData) => {
    const payload = { ...roomData, hotel_id: hotelId };
    const response = await api.post('/listings/rooms/', payload);
    return response.data;
  },

  // Hotel Images API
  uploadHotelImage: async (hotelId, imageData) => {
    const formData = new FormData();
    formData.append('image', imageData.file || imageData);
    if (imageData.image_type) formData.append('image_type', imageData.image_type);
    if (imageData.caption) formData.append('caption', imageData.caption);
    if (imageData.is_primary !== undefined) formData.append('is_primary', imageData.is_primary);
    if (imageData.order !== undefined) formData.append('order', imageData.order);

    const response = await api.post(`/listings/hotels/${hotelId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Hotel Amenities API
  getHotelAmenities: async () => {
    const response = await api.get('/listings/amenities/');
    return response.data;
  },

  addHotelAmenity: async (hotelId, amenityId, payload = {}) => {
    const response = await api.post(`/listings/hotels/${hotelId}/amenities/`, {
      amenity_id: amenityId,
      is_available: true,
      ...payload,
    });
    return response.data;
  },

  updateRoomType: async (roomTypeId, roomData) => {
    const response = await api.patch(`/listings/rooms/${roomTypeId}/`, roomData);
    return response.data;
  },

  getHotelRoomTypes: async (hotelId, params = {}) => {
    const response = await api.get(`/listings/hotels/${hotelId}/rooms/`, { params });
    return response.data;
  },

  getRoomType: async (roomTypeId) => {
    const response = await api.get(`/listings/rooms/${roomTypeId}/`);
    return response.data;
  },

  // Room Image APIs
  uploadRoomImage: async (roomTypeId, imageData) => {
    const formData = new FormData();
    formData.append('image', imageData.file || imageData);
    if (imageData.image_type) formData.append('image_type', imageData.image_type);
    if (imageData.caption) formData.append('caption', imageData.caption);
    if (imageData.is_primary !== undefined) formData.append('is_primary', imageData.is_primary);
    if (imageData.order !== undefined) formData.append('order', imageData.order);
    
    const response = await api.post(`/listings/rooms/${roomTypeId}/images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteRoomImage: async (roomTypeId, imageId) => {
    const response = await api.delete(`/listings/rooms/${roomTypeId}/images/${imageId}/`);
    return response.data;
  },

  // Favorites
  getFavorites: async () => {
    const response = await api.get('/listings/favorites/');
    return response.data;
  },

  addFavorite: async (hotelId) => {
    const response = await api.post('/listings/favorites/', { hotel_id: hotelId });
    return response.data;
  },

  removeFavorite: async (hotelId) => {
    const response = await api.delete(`/listings/favorites/${hotelId}/`);
    return response.data;
  },

  // BnB favorites
  getBnBFavorites: async () => {
    const response = await api.get('/listings/favorites/bnb/');
    return response.data;
  },

  getCombinedFavorites: async () => {
    const response = await api.get('/listings/favorites/combined/');
    return response.data;
  },

  addBnBFavorite: async (bnbListingId) => {
    const response = await api.post('/listings/favorites/bnb/', { bnb_listing_id: bnbListingId });
    return response.data;
  },

  removeBnBFavorite: async (bnbListingId) => {
    const response = await api.delete(`/listings/favorites/bnb/${bnbListingId}/`);
    return response.data;
  },
};

// BnB API
export const bnbAPI = {
  // Public list of BnB listings
  getListings: async (params = {}) => {
    const response = await api.get('/listings/bnb/', { params });
    return response.data;
  },
  // Get single BnB listing by ID
  get: async (id) => {
    const response = await api.get(`/listings/bnb/${id}/`);
    return response.data;
  },
  getListing: async (id) => {
    const response = await api.get(`/listings/bnb/${id}/`);
    return response.data;
  },
  // Current user's BnB listings
  getMyListings: async () => {
    const response = await api.get('/listings/bnb/my-listings/');
    return response.data;
  },
  // Create
  create: async (data) => {
    const response = await api.post('/listings/bnb/', data);
    return response.data;
  },
  // Update
  update: async (id, data) => {
    const response = await api.patch(`/listings/bnb/${id}/`, data);
    return response.data;
  },
  // Upload a compliance permit document (owner_permit or company_permit)
  uploadPermit: async (id, fieldName, file) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    const config = {
      timeout: 60000,
      transformRequest: [(data, headers) => {
        delete headers['Content-Type'];
        return data;
      }],
    };
    const response = await api.patch(`/listings/bnb/${id}/`, formData, config);
    return response.data;
  },
  // Delete
  remove: async (id) => {
    const response = await api.delete(`/listings/bnb/${id}/`);
    return response.data;
  },
  // Image management
  getImages: async (bnbId) => {
    const response = await api.get(`/listings/bnb/${bnbId}/images/`);
    return response.data;
  },
  uploadImage: async (bnbId, imageData) => {
    const formData = new FormData();
    // Ensure we're appending the actual File object
    if (!imageData.image || !(imageData.image instanceof File)) {
      throw new Error('Invalid image file provided');
    }
    formData.append('image', imageData.image);
    if (imageData.image_type) formData.append('image_type', imageData.image_type);
    if (imageData.caption) formData.append('caption', imageData.caption);
    if (imageData.is_primary !== undefined) formData.append('is_primary', imageData.is_primary);
    if (imageData.order !== undefined) formData.append('order', imageData.order);
    
    // Create a custom config that removes Content-Type so axios can set it automatically
    // with the correct boundary for multipart/form-data
    const config = {
      timeout: 60000, // 60 seconds for large image uploads
      transformRequest: [(data, headers) => {
        // Remove Content-Type header to let axios set it automatically for FormData
        delete headers['Content-Type'];
        return data;
      }],
    };
    
    const response = await api.post(`/listings/bnb/${bnbId}/images/`, formData, config);
    return response.data;
  },
  updateImage: async (bnbId, imageId, imageData) => {
    const formData = new FormData();
    if (imageData.image) formData.append('image', imageData.image);
    if (imageData.image_type) formData.append('image_type', imageData.image_type);
    if (imageData.caption !== undefined) formData.append('caption', imageData.caption);
    if (imageData.is_primary !== undefined) formData.append('is_primary', imageData.is_primary);
    if (imageData.order !== undefined) formData.append('order', imageData.order);
    
    const response = await api.patch(`/listings/bnb/${bnbId}/images/${imageId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  deleteImage: async (bnbId, imageId) => {
    const response = await api.delete(`/listings/bnb/${bnbId}/images/${imageId}/`);
    return response.data;
  },
  // Availability calendar
  getAvailability: async (bnbId, params = {}) => {
    const response = await api.get(`/listings/bnb/${bnbId}/availability/`, { params });
    return response.data;
  },
  getAvailabilityCalendar: async (bnbId, params = {}) => {
    const response = await api.get(`/listings/bnb/${bnbId}/availability-calendar/`, { params });
    return response.data;
  },
  createAvailability: async (bnbId, availabilityData) => {
    const response = await api.post(`/listings/bnb/${bnbId}/availability/`, availabilityData);
    return response.data;
  },
  updateAvailability: async (bnbId, availabilityId, availabilityData) => {
    const response = await api.patch(`/listings/bnb/${bnbId}/availability/${availabilityId}/`, availabilityData);
    return response.data;
  },
  deleteAvailability: async (bnbId, availabilityId) => {
    const response = await api.delete(`/listings/bnb/${bnbId}/availability/${availabilityId}/`);
    return response.data;
  },
  // Search
  search: async (params = {}) => {
    // Django's QueryDict.getlist() expects repeated bare keys (amenities=a&amenities=b),
    // not axios's default bracket notation (amenities[]=a&amenities[]=b), so array
    // params are serialized manually via URLSearchParams.
    const { amenities, ...rest } = params;
    const searchParams = new URLSearchParams();
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    if (Array.isArray(amenities)) {
      amenities.forEach((amenity) => searchParams.append('amenities', amenity));
    }
    const response = await api.get('/listings/bnb/search/', { params: searchParams });
    return response.data;
  },
};

// Bookings API
export const bookingsAPI = {
  // Get all bookings
  getBookings: async (params = {}) => {
    const response = await api.get('/bookings/', { params });
    return response.data;
  },

  // Get booking by ID
  getBooking: async (id) => {
    const response = await api.get(`/bookings/${id}/`);
    return response.data;
  },

  // Create booking
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings/', bookingData);
    return response.data;
  },

  // Update booking
  updateBooking: async (id, bookingData) => {
    const response = await api.patch(`/bookings/${id}/`, bookingData);
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (id) => {
    const response = await api.post(`/bookings/${id}/cancel/`);
    return response.data;
  },

  // Finalize a host-approved booking as pay-at-premises (no online payment)
  confirmPayAtPremises: async (id) => {
    const response = await api.post(`/bookings/${id}/confirm-pay-at-premises/`);
    return response.data;
  },

  // Get user's bookings
  getUserBookings: async () => {
    const response = await api.get('/bookings/my-bookings/');
    return response.data;
  },

  // Get bookings for host-owned properties (hotel + bnb)
  getHostBookings: async (params = {}) => {
    const response = await api.get('/bookings/host/', { params });
    return response.data;
  },

  // Host status management for bookings on host-owned properties
  updateHostBookingStatus: async (id, statusValue) => {
    const response = await api.post(`/bookings/${id}/host-status/`, { status: statusValue });
    return response.data;
  },
};

// Concierge API removed

// Payments API
export const paymentsAPI = {
  // Create payment intent
  createPaymentIntent: async (paymentData) => {
    const response = await api.post('/payments/intents/', paymentData);
    return response.data;
  },

  // Get payment intent
  getPaymentIntent: async (reference) => {
    const response = await api.get(`/payments/intents/${reference}/`);
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async () => {
    const response = await api.get('/payments/history/');
    return response.data;
  },

  // Dev-only: simulate payment success
  simulatePaymentSuccess: async (reference) => {
    const response = await api.post('/payments/simulate-success/', { reference });
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  // Get reviews for a hotel
  getHotelReviews: async (hotelId, params = {}) => {
    const response = await api.get(`/reviews/hotel/${hotelId}/`, { params });
    return response.data;
  },

  // Get hotel review stats
  getHotelReviewStats: async (hotelId) => {
    const response = await api.get(`/reviews/hotel/${hotelId}/stats/`);
    return response.data;
  },

  // Get reviews for a BnB listing
  getBnBReviews: async (bnbId, params = {}) => {
    const response = await api.get(`/reviews/bnb/${bnbId}/`, { params });
    return response.data;
  },

  // Get BnB review stats
  getBnBReviewStats: async (bnbId) => {
    const response = await api.get(`/reviews/bnb/${bnbId}/stats/`);
    return response.data;
  },

  // Create review
  createReview: async (reviewData) => {
    const response = await api.post('/reviews/', reviewData);
    return response.data;
  },

  // Update review
  updateReview: async (id, reviewData) => {
    const response = await api.patch(`/reviews/${id}/`, reviewData);
    return response.data;
  },

  // Delete review
  deleteReview: async (id) => {
    const response = await api.delete(`/reviews/${id}/`);
    return response.data;
  },

  // Host reply on own listing reviews
  replyToReview: async (id, reply) => {
    const response = await api.post(`/reviews/${id}/reply/`, { reply });
    return response.data;
  },
};

// Service Requests API
// Concierge service requests removed

// Service Offers API
// Concierge service offers removed

// Promotions API
export const promotionsAPI = {
  // Get all promotions
  getPromotions: async (params = {}) => {
    const response = await api.get('/promotions/', { params });
    return response.data;
  },

  // Get promotion by ID
  getPromotion: async (id) => {
    const response = await api.get(`/promotions/${id}/`);
    return response.data;
  },

  // Get active promotions by type
  getActivePromotions: async (promotionType) => {
    const response = await api.get(`/promotions/active/${promotionType}/`);
    return response.data;
  },

  // Track promotion view
  trackPromotionView: async (promotionId) => {
    const response = await api.post(`/promotions/${promotionId}/track-view/`);
    return response.data;
  },

  // Track promotion click
  trackPromotionClick: async (promotionId) => {
    const response = await api.post(`/promotions/${promotionId}/track-click/`);
    return response.data;
  },

  // Create promotion
  createPromotion: async (promotionData) => {
    const response = await api.post('/promotions/', promotionData);
    return response.data;
  },

  // Update promotion
  updatePromotion: async (id, promotionData) => {
    const response = await api.patch(`/promotions/${id}/`, promotionData);
    return response.data;
  },

  // Delete promotion
  deletePromotion: async (id) => {
    const response = await api.delete(`/promotions/${id}/`);
    return response.data;
  },
};

// Notifications API
export const messagingAPI = {
  getMessages: async (bookingId) => {
    const response = await api.get(`/messaging/bookings/${bookingId}/messages/`);
    return response.data;
  },
  sendMessage: async (bookingId, body) => {
    const response = await api.post(`/messaging/bookings/${bookingId}/messages/`, { body });
    return response.data;
  },
};

export const notificationsAPI = {
  // Get user notifications
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications/', { params });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read/`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.post('/notifications/mark-all-read/');
    return response.data;
  },
};

export default api;
