import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { clearAuth, fetchUserMe } from '../../store/slices/authSlice';

const AuthInitializer = ({ children }) => {
  const { isAuthenticated, user, tokens } = useAuth();
  const dispatch = useDispatch();
  const attemptedRef = useRef(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent repeated fetch loops when token is invalid or backend is down.
      if (!isAuthenticated || user || !tokens.access || attemptedRef.current) return;

      attemptedRef.current = true;
      try {
        await dispatch(fetchUserMe()).unwrap();
      } catch (error) {
        console.error('Failed to fetch user data on initialization:', error);
        // Hard reset broken auth state to stop repeated failing requests/toasts.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch(clearAuth());
      }
    };

    initializeAuth();
  }, [dispatch, isAuthenticated, user, tokens.access]);

  return children;
};

export default AuthInitializer;
