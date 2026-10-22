import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { clearAuth, fetchUserMe, updateTokens } from '../../store/slices/authSlice';

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

  // Tokens live in localStorage, which is shared across every tab on this
  // origin. Another tab (e.g. one silently polling notifications in the
  // background) can refresh its own expired access token at any moment,
  // and that overwrites accessToken/refreshToken here too -- with no event
  // inside THIS tab's own React/Redux tree to notice. Without this listener,
  // this tab keeps showing the old user in the header while every request
  // it makes silently goes out under the other tab's identity, surfacing
  // only as a confusing 403 ("you can only update your own listing") on
  // whatever the user happens to be editing. The browser's `storage` event
  // fires in every OTHER tab whenever one tab changes localStorage, so we
  // use it to re-sync this tab's identity the moment that happens.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== 'accessToken' && event.key !== 'refreshToken') return;
      if (event.newValue === event.oldValue) return;

      if (!event.newValue) {
        // Another tab logged out / cleared tokens.
        dispatch(clearAuth());
        return;
      }

      const newAccess = localStorage.getItem('accessToken');
      const newRefresh = localStorage.getItem('refreshToken');
      dispatch(updateTokens({ access: newAccess, refresh: newRefresh }));

      // Re-fetch so `user` (and anything derived from it, like the header
      // name) reflects whoever the token now actually belongs to -- it may
      // be a different account than the one this tab last knew about.
      attemptedRef.current = false;
      dispatch(fetchUserMe())
        .unwrap()
        .then(() => {
          toast('You were signed in as a different account in another tab. This tab has been updated to match.', {
            icon: '⚠️',
          });
        })
        .catch((error) => {
          console.error('Failed to re-sync user after cross-tab token change:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          dispatch(clearAuth());
        });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

  return children;
};

export default AuthInitializer;
