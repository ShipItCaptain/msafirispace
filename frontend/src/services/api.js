import axios from 'axios';

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

  // Host onboarding with files (multipart)
  onboardHostFormData: async (formData) => {
    const response = await api.post('/auth/host/onboard/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get host dashboard
  getHostDashboard: async () => {
    const response = await api.get('/auth/host/dashboard/');
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

  updateRoomType: async (roomTypeId, roomData) => {
    const response = await api.patch(`/listings/rooms/${roomTypeId}/`, roomData);
    return response.data;
  },

  getHotelRoomTypes: async (hotelId, params = {}) => {
    const response = await api.get(`/listings/hotels/${hotelId}/rooms/`, { params });
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
};

// BnB API
export const bnbAPI = {
  // Public list of BnB listings
  getListings: async (params = {}) => {
    const response = await api.get('/listings/bnb/', { params });
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
  // Delete
  remove: async (id) => {
    const response = await api.delete(`/listings/bnb/${id}/`);
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

  // Get user's bookings
  getUserBookings: async () => {
    const response = await api.get('/bookings/my-bookings/');
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
