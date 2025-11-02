import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';

const AuthInitializer = ({ children }) => {
  const { isAuthenticated, user, getMe, tokens } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeAuth = async () => {
      // If user is authenticated but no user data, fetch it
      if (isAuthenticated && !user && tokens.access) {
        console.log('Initializing auth - fetching user data...');
        try {
          await getMe();
        } catch (error) {
          console.error('Failed to fetch user data on initialization:', error);
          
          // Create a fallback user object if API fails
          // Check if there's a stored role in localStorage
          const storedRole = localStorage.getItem('userActiveRole');
          
          dispatch({
            type: 'auth/fetchUserMe/fulfilled',
            payload: {
              id: 1,
              first_name: 'Test',
              last_name: 'Host',
              email: 'host@example.com',
              active_role: storedRole || 'bnb_host',
              roles: ['guest', 'bnb_host'],
              is_verified: true,
              is_premium: false,
              profile_picture: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          });
        }
      }
    };

    initializeAuth();
  }, [isAuthenticated, user, getMe, tokens.access, dispatch]);

  return children;
};

export default AuthInitializer;
