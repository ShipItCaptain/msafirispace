import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.tokens.access);
      localStorage.setItem('refreshToken', response.tokens.refresh);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      // Store tokens in localStorage
      localStorage.setItem('accessToken', response.tokens.access);
      localStorage.setItem('refreshToken', response.tokens.refresh);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      // Clear tokens from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    } catch (error) {
      // Even if logout fails, clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue(error.response?.data || 'Logout failed');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getProfile();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch profile');
    }
  }
);

export const fetchUserMe = createAsyncThunk(
  'auth/fetchUserMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getMe();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user details');
    }
  }
);

export const addUserRole = createAsyncThunk(
  'auth/addUserRole',
  async (roleData, { rejectWithValue }) => {
    try {
      const response = await authAPI.addRole(roleData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to add role');
    }
  }
);

export const switchUserRole = createAsyncThunk(
  'auth/switchUserRole',
  async (roleData, { rejectWithValue }) => {
    try {
      const response = await authAPI.switchRole(roleData);
      // Update tokens if provided
      if (response.tokens) {
        localStorage.setItem('accessToken', response.tokens.access);
        localStorage.setItem('refreshToken', response.tokens.refresh);
      }
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to switch role');
    }
  }
);

export const removeUserRole = createAsyncThunk(
  'auth/removeUserRole',
  async (role, { rejectWithValue }) => {
    try {
      const response = await authAPI.removeRole(role);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to remove role');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update profile');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await authAPI.refreshToken(refreshToken);
      localStorage.setItem('accessToken', response.access);
      return response;
    } catch (error) {
      // If refresh fails, clear tokens and logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return rejectWithValue(error.response?.data || 'Token refresh failed');
    }
  }
);

// Initial state
const initialState = {
  user: null,
  tokens: {
    access: localStorage.getItem('accessToken') || null,
    refresh: localStorage.getItem('refreshToken') || null,
  },
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  isProfileLoading: false,
  profileError: null,
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.profileError = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = { access: null, refresh: null };
      state.isAuthenticated = false;
      state.error = null;
      state.profileError = null;
    },
    updateTokens: (state, action) => {
      state.tokens = { ...state.tokens, ...action.payload };
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    setSession: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        // Persist the server's active_role immediately on login
        try {
          if (action.payload?.user?.active_role) {
            localStorage.setItem('userActiveRole', action.payload.user.active_role);
          }
        } catch (_) {}
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : action.payload?.detail || action.payload?.message || 'Login failed';
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : action.payload?.detail || action.payload?.message || 'Registration failed';
      })
      
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = { access: null, refresh: null };
        state.isAuthenticated = false;
        state.error = null;
        state.profileError = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : action.payload?.detail || action.payload?.message || 'Logout failed';
        // Still clear the state even if logout fails
        state.user = null;
        state.tokens = { access: null, refresh: null };
        state.isAuthenticated = false;
      })
      
      // Fetch Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isProfileLoading = false;
        state.user = action.payload;
        state.profileError = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload;
      })
      
      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isProfileLoading = false;
        state.user = action.payload;
        state.profileError = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload;
      })
      
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens.access = action.payload.access;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state) => {
        // If refresh fails, clear auth state
        state.user = null;
        state.tokens = { access: null, refresh: null };
        state.isAuthenticated = false;
      })
      
      // Fetch User Me
      .addCase(fetchUserMe.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserMe.fulfilled, (state, action) => {
        state.isLoading = false;
        // Trust the server as the source of truth for active_role.
        state.user = action.payload;
        // Keep localStorage in sync with server-provided active_role for future sessions
        try {
          if (action.payload?.active_role) {
            localStorage.setItem('userActiveRole', action.payload.active_role);
          }
        } catch (_) {}
        state.error = null;
      })
      .addCase(fetchUserMe.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Add Role
      .addCase(addUserRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addUserRole.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update user with new role
        if (action.payload.user) {
          state.user = action.payload.user;
          // Save active role to localStorage if changed
          if (action.payload.user?.active_role) {
            localStorage.setItem('userActiveRole', action.payload.user.active_role);
          }
        }
        state.error = null;
      })
      .addCase(addUserRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Switch Role
      .addCase(switchUserRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(switchUserRole.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        // Save active role to localStorage for persistence
        if (action.payload.user?.active_role) {
          localStorage.setItem('userActiveRole', action.payload.user.active_role);
        }
        // Update tokens if provided
        if (action.payload.tokens) {
          state.tokens = { ...state.tokens, ...action.payload.tokens };
        }
        state.error = null;
      })
      .addCase(switchUserRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Remove Role
      .addCase(removeUserRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeUserRole.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update user without the removed role
        if (action.payload.user) {
          state.user = action.payload.user;
          // Update localStorage with new active role
          if (action.payload.user?.active_role) {
            localStorage.setItem('userActiveRole', action.payload.user.active_role);
          }
        }
        state.error = null;
      })
      .addCase(removeUserRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearError, setUser, clearAuth, updateTokens, setSession } = authSlice.actions;

// Export selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectTokens = (state) => state.auth.tokens;
export const selectIsProfileLoading = (state) => state.auth.isProfileLoading;
export const selectProfileError = (state) => state.auth.profileError;

export default authSlice.reducer;
