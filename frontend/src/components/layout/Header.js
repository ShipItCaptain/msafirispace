import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { switchUserRole, addUserRole, fetchUserMe } from '../../store/slices/authSlice';
import { toast } from 'react-hot-toast';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserIcon, 
  BellIcon,
  HomeIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserMenuOpen && !event.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close user menu when route changes
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
  };

  const handleHeaderRoleToggle = async () => {
    if (!user) return;
    try {
      // First, fetch fresh user data from backend to get current active_role
      const freshUserData = await dispatch(fetchUserMe()).unwrap();
      const currentActiveRole = freshUserData?.active_role || user.active_role || 'guest';
      
      // Determine the new role to switch to based on current active_role from backend
      const isCurrentlyHost = (currentActiveRole && currentActiveRole !== 'guest');
      const newRole = isCurrentlyHost ? 'guest' : 'bnb_host';
      
      // If already on the target role, don't switch
      if (currentActiveRole === newRole) {
        console.log('Already on target role:', newRole);
        return;
      }
      
      // Check if user has the role in their roles array
      // If not, add it first before switching (except for guest which everyone has)
      const userRoles = freshUserData?.roles || user?.roles || ['guest'];
      const userHasRole = userRoles.includes(newRole);
      
      if (!userHasRole && newRole !== 'guest') {
        // Add the role first if user doesn't have it
        try {
          await dispatch(addUserRole({ role: newRole })).unwrap();
          // Refresh user data after adding role
          await dispatch(fetchUserMe()).unwrap();
        } catch (addError) {
          console.error('Failed to add role:', addError);
          // If adding role fails, still try to switch (might work if backend auto-adds)
        }
      }
      
      // Switch to the new role
      const result = await dispatch(switchUserRole({ role: newRole })).unwrap();
      
      // Update localStorage with the new role from backend response
      if (result?.user?.active_role) {
        try { localStorage.setItem('userActiveRole', result.user.active_role); } catch (_) {}
      }
      
      // Fetch fresh user data after switching to ensure state is updated
      await dispatch(fetchUserMe()).unwrap();
      
      // Navigate to appropriate page
      if (newRole === 'guest') {
        navigate('/', { replace: true });
      } else {
        navigate('/host/home', { replace: true });
      }
      
      // Reload to ensure all components pick up the new role
      setTimeout(() => { try { window.location.reload(); } catch (_) {} }, 100);
    } catch (e) {
      console.error('Header role toggle failed:', e);
      const errorMessage = e?.detail || e?.message || 'Failed to switch role. Please try again.';
      toast.error(errorMessage);
    }
  };

  // Get navigation based on user role
  const getNavigation = () => {
    
    // If not authenticated or no user data, show guest navigation
    if (!isAuthenticated || !user) {
      return [
        { name: 'Home Page', href: '/', icon: HomeIcon },
        { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon },
        { name: 'BnBs', href: '/bnbs', icon: HomeModernIcon },
      ];
    }

    const activeRole = user.active_role || 'guest';
    console.log('Active role for navigation:', activeRole);
    
    if (activeRole === 'guest') {
      // Guest navigation - browse and book services
      return [
        { name: 'Home Page', href: '/', icon: HomeIcon },
        { name: 'Hotels', href: '/hotels', icon: BuildingOfficeIcon },
        { name: 'BnBs', href: '/bnbs', icon: HomeModernIcon },
      ];
    } else {
      // Host navigation - hide general Hotel and BnB links
      return [];
    }
  };

  // Check if user is in host mode - use same logic as HomePage
  const isHostMode = user?.active_role && user.active_role !== 'guest';
  const hasHostRoles = user?.roles && user.roles.some(role => ['bnb_host', 'hotel_host'].includes(role));
  const isActuallyInHostMode = isHostMode || hasHostRoles;

  const navigation = getNavigation();
  
  // Determine current role for display - ALWAYS use active_role from backend
  // Never use fallback logic based on roles array, as active_role is the source of truth
  const getCurrentRoleDisplay = () => {
    if (!user) return 'Loading...';

    // Always use active_role from backend as the source of truth
    // If active_role is not set or is undefined/null, default to 'guest'
    const activeRole = user.active_role || 'guest';
    
    switch (activeRole) {
      case 'guest': return 'Guest';
      case 'bnb_host': return 'Host';
      case 'hotel_host': return 'Host';
      default: return 'Guest';
    }
  };
  
  const currentRoleDisplay = getCurrentRoleDisplay();

  return (
    <>
      
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-medium border-b border-secondary-100' 
          : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className={`text-2xl font-bold ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>
                Msafiri <span className="text-red-600">Space</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navigation.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`relative group p-3 rounded-lg transition-all duration-200 ${
                  isScrolled 
                    ? 'text-gray-600 hover:text-red-600 hover:bg-gray-100' 
                    : 'text-white hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                <IconComponent className="w-6 h-6" />
                
                {/* Tooltip */}
                <div className={`absolute -bottom-12 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                  isScrolled 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-900'
                }`}>
                  {item.name}
                  {/* Tooltip arrow */}
                  <div className={`absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 ${
                    isScrolled ? 'bg-gray-900' : 'bg-white'
                  }`}></div>
                </div>
              </Link>
            );
          })}
        </nav>

          {/* Right side - Auth, etc. */}
          <div className="flex items-center space-x-4">
            {/* Become a Host Button */}
            {!isActuallyInHostMode && (
              <Link
                to="/become-host"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200 shadow-soft hover:shadow-medium"
              >
                Become a Host
              </Link>
            )}

            {/* Authenticated User Menu */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">


                {/* User Menu */}
                <div className="relative user-menu-container">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
                  >
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.first_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-secondary-700">
                      {user?.first_name || 'User'}
                    </span>
                  </motion.button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-large border border-secondary-100 py-2 z-50">
                    {/* Switch Role Section */}
                    <div className="px-4 py-3 border-b border-secondary-100">
                      <div className="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-3">
                        Switch Role
                      </div>
                      
                      {/* Current Role Display */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Current Role:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {currentRoleDisplay}
                          </span>
                        </div>
                      </div>
                      
                      {/* Switch Button */}
                      <button
                        disabled={!user}
                        onClick={handleHeaderRoleToggle}
                        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
                          !user 
                            ? 'text-gray-400 bg-gray-200 cursor-not-allowed' 
                            : 'text-white bg-primary-500 hover:bg-primary-600'
                        }`}
                      >
                        <span>
                          {!user ? 'Loading user data...' :
                           (user.active_role === 'guest' || !user.active_role) ? 'Switch to Host role' : 
                           'Switch to Guest role'}
                        </span>
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Notifications */}
                    <div className="px-4 py-2 border-b border-secondary-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
                          Notifications
                        </span>
                        <div className="relative">
                          <BellIcon className="w-4 h-4 text-secondary-600" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                        </div>
                      </div>
                    </div>
                    
                    <Link
                      to={user?.is_host ? "/host-dashboard" : "/dashboard"}
                      className="block px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
                    >
                      {user?.is_host ? "Host Dashboard" : "Dashboard"}
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors duration-200"
                    >
                      Logout
                    </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Guest User Menu */
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-secondary-700 hover:text-primary-500 transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200 shadow-soft hover:shadow-medium"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-secondary-600 hover:text-primary-500 hover:bg-secondary-100 transition-colors duration-200"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white border-t border-secondary-100"
          >
            <div className="px-4 py-6 space-y-4">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-3 text-lg font-semibold text-gray-900 hover:text-red-600 transition-colors duration-200 py-2 px-3 rounded-lg hover:bg-gray-50"
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Become a Host Button - Mobile */}
              {!isActuallyInHostMode && (
                <Link
                  to="/become-host"
                  className="block w-full text-center px-4 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200"
                >
                  Become a Host
                </Link>
              )}
              
              {isAuthenticated ? (
                <div className="space-y-4 pt-4 border-t border-secondary-100">
                  {/* Switch Role - Mobile */}
                  <div className="px-4 py-3 border-b border-secondary-100">
                    <div className="text-sm font-medium text-secondary-500 uppercase tracking-wide mb-3">
                      Switch Role
                    </div>
                    
                    {/* Current Role Display - Mobile */}
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        <span className="text-base text-gray-600">Current Role:</span>
                        <span className="text-base font-semibold text-gray-900">
                          {currentRoleDisplay}
                        </span>
                      </div>
                    </div>
                    
                    {/* Switch Button - Mobile */}
                    <button
                      onClick={handleHeaderRoleToggle}
                      className="w-full text-center px-4 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>
                        {currentRoleDisplay === 'Guest' ? 'Switch to Host role' : 
                         'Switch to Guest role'}
                      </span>
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Notifications */}
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-lg font-medium text-secondary-700">
                      Notifications
                    </span>
                    <div className="relative">
                      <BellIcon className="w-5 h-5 text-secondary-600" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                    </div>
                  </div>
                  
                  <Link
                    to={user?.is_host ? "/host-dashboard" : "/dashboard"}
                    className="block text-lg font-medium text-secondary-700 hover:text-primary-500 transition-colors duration-200"
                  >
                    {user?.is_host ? "Host Dashboard" : "Dashboard"}
                  </Link>
                  <Link
                    to="/profile"
                    className="block text-lg font-medium text-secondary-700 hover:text-primary-500 transition-colors duration-200"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left text-lg font-medium text-error-600 hover:text-error-700 transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-secondary-100">
                  <Link
                    to="/login"
                    className="block text-lg font-medium text-secondary-700 hover:text-primary-500 transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full text-center px-4 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors duration-200"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
};

export default Header;
