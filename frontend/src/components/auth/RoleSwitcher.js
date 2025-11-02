import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDownIcon, 
  CheckIcon, 
  PlusIcon,
  XMarkIcon,
  HomeIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  UserIcon,
  MapIcon
} from '@heroicons/react/24/outline';
import { switchUserRole, addUserRole, removeUserRole, fetchUserMe } from '../../store/slices/authSlice';

const RoleSwitcher = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roleConfig = {
    guest: {
      label: 'Guest',
      icon: UserIcon,
      description: 'Browse and book accommodations'
    },
    bnb_host: {
      label: 'BnB Host',
      icon: HomeIcon,
      description: 'Manage BnB properties'
    },
    hotel_host: {
      label: 'Hotel Host',
      icon: BuildingOfficeIcon,
      description: 'Manage hotel accommodations'
    },
    tour_operator: {
      label: 'Tour Operator',
      icon: MapIcon,
      description: 'Offer tour services'
    }
  };

  const availableRoles = ['guest', 'bnb_host', 'hotel_host', 'tour_operator'];
  const userRoles = user?.roles || ['guest']; // Default to guest role
  const activeRole = user?.active_role || 'guest'; // Default to guest role

  const handleRoleSwitch = async (role) => {
    if (role === activeRole) return;
    
    setIsLoading(true);
    try {
      const result = await dispatch(switchUserRole({ role })).unwrap();
      // Optimistically update Redux user immediately
      const updatedUser = result?.user ? result.user : { ...(user || {}), active_role: role };
      dispatch({ type: 'auth/updateUser', payload: updatedUser });
      // Persist selection so all pages read the same active role immediately
      try { localStorage.setItem('userActiveRole', role); } catch (_) {}
      // Refresh user state to ensure all pages re-render with new role
      try { await dispatch(fetchUserMe()).unwrap(); } catch (_) {}
      setIsOpen(false);
      
      // Check if switching to host role and redirect to host home if new
      if (role !== 'guest' && user) {
        // Check if user has any listings
        const hasListings = await checkUserHasListings();
        
        // If switching to host role and has no listings, redirect to host home
        if (!hasListings && ['bnb_host', 'hotel_host'].includes(role)) {
          // Check localStorage to see if they've visited host home before
          const hasVisitedHostHome = localStorage.getItem(`hasVisitedHostHome_${role}`);
          
          if (!hasVisitedHostHome) {
            navigate('/host/home');
          }
        }
      } else if (role === 'guest') {
        // Ensure we always exit host-only pages when moving to guest
        navigate('/', { replace: true });
      }
      // Strong consistency fallback: full reload so deep pages/guards pick up the new role
      setTimeout(() => { if (document.visibilityState) { try { window.location.reload(); } catch (_) {} } }, 25);
    } catch (error) {
      console.error('Failed to switch role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserHasListings = async () => {
    try {
      const { listingsAPI, bnbAPI } = await import('../../services/api');
      const [myHotels, myBnB] = await Promise.all([
        listingsAPI.getUserListings().catch(() => ({ results: [] })),
        bnbAPI.getMyListings().catch(() => ({ results: [] })),
      ]);
      const hotelCount = (myHotels?.results || myHotels || []).length;
      const bnbCount = (myBnB?.results || myBnB || []).length;
      return hotelCount + bnbCount > 0;
    } catch (error) {
      console.error('Error checking listings:', error);
      return false;
    }
  };

  const handleAddRole = async (role) => {
    setIsLoading(true);
    try {
      await dispatch(addUserRole({ role })).unwrap();
      
      // If adding a host role and user doesn't have listings, redirect to host home
      if (['bnb_host', 'hotel_host'].includes(role)) {
        const hasListings = await checkUserHasListings();
        
        if (!hasListings) {
          const hasVisitedHostHome = localStorage.getItem(`hasVisitedHostHome_${role}`);
          
          if (!hasVisitedHostHome) {
            // Switch to the new role and navigate to host home
            await dispatch(switchUserRole({ role })).unwrap();
            navigate('/host/home');
          }
        }
      }
    } catch (error) {
      console.error('Failed to add role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRole = async (role) => {
    if (role === activeRole) {
      alert('Cannot remove active role. Please switch to another role first.');
      return;
    }
    
    if (userRoles.length === 1) {
      alert('Cannot remove the last remaining role.');
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(removeUserRole(role)).unwrap();
    } catch (error) {
      console.error('Failed to remove role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRoleConfig = roleConfig[activeRole] || roleConfig.guest;
  const CurrentRoleIcon = currentRoleConfig.icon;

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 w-full text-sm text-secondary-700 hover:bg-secondary-50 transition-colors duration-200 disabled:opacity-50"
      >
        <CurrentRoleIcon className="w-4 h-4" />
        <span className="flex-1 text-left">{currentRoleConfig.label}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Current Role */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-green-500" />
              <span>Current: {currentRoleConfig.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{currentRoleConfig.description}</p>
          </div>

          {/* Available Roles */}
          <div className="py-2">
            <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Switch Role
            </div>
            {userRoles.map((role) => {
              const config = roleConfig[role];
              if (!config || role === activeRole) return null;
              
              const IconComponent = config.icon;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  disabled={isLoading}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                  <IconComponent className="w-4 h-4" />
                  <div className="flex-1 text-left">
                    <div>{config.label}</div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add New Role */}
          {userRoles.length < availableRoles.length && (
            <>
              <div className="border-t border-gray-100 py-2">
                <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Add Role
                </div>
                {availableRoles
                  .filter(role => !userRoles.includes(role))
                  .map((role) => {
                    const config = roleConfig[role];
                    const IconComponent = config.icon;
                    return (
                      <button
                        key={role}
                        onClick={() => handleAddRole(role)}
                        disabled={isLoading}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <IconComponent className="w-4 h-4" />
                        <div className="flex-1 text-left">
                          <div>Add {config.label}</div>
                          <div className="text-xs text-gray-500">{config.description}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </>
          )}

          {/* Remove Role */}
          {userRoles.length > 1 && (
            <div className="border-t border-gray-100 py-2">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Remove Role
              </div>
              {userRoles
                .filter(role => role !== activeRole)
                .map((role) => {
                  const config = roleConfig[role];
                  const IconComponent = config.icon;
                  return (
                    <button
                      key={role}
                      onClick={() => handleRemoveRole(role)}
                      disabled={isLoading}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <IconComponent className="w-4 h-4" />
                      <div className="flex-1 text-left">
                        <div>Remove {config.label}</div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
