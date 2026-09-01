import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectTokens,
  selectIsProfileLoading,
  selectProfileError,
  loginUser,
  registerUser,
  logoutUser,
  fetchUserProfile,
  updateUserProfile,
  fetchUserMe,
  addUserRole,
  switchUserRole,
  removeUserRole,
  clearError,
} from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Selectors
  const auth = useSelector(selectAuth);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectAuthError);
  const tokens = useSelector(selectTokens);
  const isProfileLoading = useSelector(selectIsProfileLoading);
  const profileError = useSelector(selectProfileError);

  // Actions
  const extractErrorMessage = (err) => {
    if (!err) return 'An error occurred';
    if (typeof err === 'string') return err;
    if (err.detail) return err.detail;
    if (err.message) return err.message;
    if (Array.isArray(err.non_field_errors) && err.non_field_errors.length > 0) {
      return err.non_field_errors[0];
    }
    // Find first field error
    for (const key in err) {
      const value = err[key];
      if (Array.isArray(value) && value.length > 0) return `${key}: ${value[0]}`;
      if (typeof value === 'string') return `${key}: ${value}`;
    }
    return 'An error occurred';
  };

  const login = async (credentials) => {
    try {
      // Land the user wherever their active_role last was (guest or a host
      // role) instead of forcing everyone back to guest on every login --
      // loginUser's reducer already persists whatever active_role the
      // backend reports, and HomePage/RoleGuard read that to route
      // accordingly, so no extra role-switch call is needed here.
      const result = await dispatch(loginUser(credentials)).unwrap();
      toast.success('Login successful!');
      return result;
    } catch (error) {
      const errorMessage = extractErrorMessage(error) || 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      toast.success('Registration successful! Please check your email for verification.');
      return result;
    } catch (error) {
      const errorMessage = extractErrorMessage(error) || 'Registration failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success('Logout successful!');
      navigate('/');
    } catch (error) {
      // Even if logout fails, redirect to home
      toast.error('Logout failed, but you have been signed out locally.');
      navigate('/');
    }
  };

  const getProfile = async () => {
    try {
      const result = await dispatch(fetchUserProfile()).unwrap();
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch profile';
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const result = await dispatch(updateUserProfile(profileData)).unwrap();
      toast.success('Profile updated successfully!');
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to update profile';
      toast.error(errorMessage);
      throw error;
    }
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  const getMe = async () => {
    try {
      const result = await dispatch(fetchUserMe()).unwrap();
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to fetch user details';
      toast.error(errorMessage);
      throw error;
    }
  };

  const addRole = async (roleData) => {
    try {
      const result = await dispatch(addUserRole(roleData)).unwrap();
      toast.success('Role added successfully!');
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to add role';
      toast.error(errorMessage);
      throw error;
    }
  };

  const switchRole = async (roleData) => {
    try {
      const result = await dispatch(switchUserRole(roleData)).unwrap();
      toast.success(`Switched to ${roleData.role} role!`);
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to switch role';
      toast.error(errorMessage);
      throw error;
    }
  };

  const removeRole = async (role) => {
    try {
      const result = await dispatch(removeUserRole(role)).unwrap();
      toast.success('Role removed successfully!');
      return result;
    } catch (error) {
      const errorMessage = error?.detail || error?.message || 'Failed to remove role';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Check if user has any host role
  const isHost = user?.roles?.some(role => ['bnb_host', 'hotel_host'].includes(role));
  
  // Check if user is a guest
  const isGuest = user?.active_role === 'guest' || user?.roles?.includes('guest');
  
  // Check specific roles based on active role
  const isBnBHost = user?.active_role === 'bnb_host';
  const isHotelRestaurantHost = user?.active_role === 'hotel_host';
  
  // Check if user is verified
  const isVerified = user?.is_verified;
  
  // Check if user is premium
  const isPremium = user?.is_premium;

  return {
    // State
    auth,
    user,
    isAuthenticated,
    isLoading,
    error,
    tokens,
    isProfileLoading,
    profileError,
    
    // Actions
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    getMe,
    addRole,
    switchRole,
    removeRole,
    clearAuthError,
    
    // Computed values
    isHost,
    isGuest,
    isBnBHost,
    isHotelRestaurantHost,
    isVerified,
    isPremium,
  };
};
