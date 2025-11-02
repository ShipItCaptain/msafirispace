import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import RoleIndicator from '../components/auth/RoleIndicator';
import RoleSwitcher from '../components/auth/RoleSwitcher';
import { 
  CalendarDaysIcon, 
  BuildingOfficeIcon, 
  SparklesIcon, 
  StarIcon,
  CreditCardIcon,
  PlusIcon,
  UserIcon,
  EyeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MapIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { authAPI, bookingsAPI, listingsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user, isBnBHost, isHotelRestaurantHost } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const isGuest = user?.active_role === 'guest';
  const [guestSummary, setGuestSummary] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState(null);
  
  // Bookings state for guest
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('all'); // all, upcoming, in_progress, past, pending
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState(null);

  useEffect(() => {
    if (!isGuest) return;
    const load = async () => {
      try {
        setGuestLoading(true);
        const data = await authAPI.getUserDashboard();
        setGuestSummary(data);
      } catch (e) {
        setGuestError('Failed to load your dashboard');
      } finally {
        setGuestLoading(false);
      }
    };
    load();
  }, [isGuest]);

  // Load bookings when guest views bookings tab
  useEffect(() => {
    if (!isGuest || activeTab !== 'bookings') return;
    
    const loadBookings = async () => {
      try {
        setBookingsLoading(true);
        setBookingsError(null);
        const data = await bookingsAPI.getBookings();
        // Handle paginated response
        const bookingsList = data.results || data || [];
        setBookings(bookingsList);
      } catch (err) {
        setBookingsError('Failed to load bookings');
        console.error('Error loading bookings:', err);
      } finally {
        setBookingsLoading(false);
      }
    };
    
    loadBookings();
  }, [isGuest, activeTab]);

  // Load favorites when favorites tab is active
  useEffect(() => {
    if (!isGuest || activeTab !== 'favorites') return;
    const loadFavorites = async () => {
      try {
        setFavoritesLoading(true);
        setFavoritesError(null);
        const data = await listingsAPI.getFavorites();
        const list = data.results || data || [];
        setFavorites(list);
      } catch (err) {
        setFavoritesError('Failed to load favorites');
      } finally {
        setFavoritesLoading(false);
      }
    };
    loadFavorites();
  }, [isGuest, activeTab]);

  const FavoritesSection = () => {
    if (!isGuest) return null;
    return (
      <div className="bg-white rounded-lg shadow p-6">
        {favoritesLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading favorites...</p>
          </div>
        ) : favoritesError ? (
          <p className="text-red-600">{favoritesError}</p>
        ) : favorites.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-700 mb-4">You have no favorites yet.</p>
            <Link to="/search" className="px-4 py-2 bg-red-600 text-white rounded-lg">Find places to stay</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div key={fav.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <Link to={`/hotel/${fav.hotel?.id || fav.hotel_id || ''}`} className="block p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{fav.hotel?.name || 'Hotel'}</h3>
                    <span className="text-xs text-gray-500">Saved</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{fav.hotel?.short_description || ''}</p>
                  <div className="mt-2 text-sm text-gray-500">{fav.hotel?.city}, {fav.hotel?.country}</div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Mock data - in real app, this would come from API
  const stats = {
    totalBookings: 24,
    totalRevenue: 12500,
    activeListings: 3,
    pendingBookings: 5,
    completedBookings: 19,
    averageRating: 4.8
  };

  const recentBookings = [
    {
      id: 1,
      guestName: 'John Doe',
      propertyName: 'Luxury Beach Villa',
      checkIn: '2024-01-15',
      checkOut: '2024-01-18',
      status: 'confirmed',
      amount: 450
    },
    {
      id: 2,
      guestName: 'Jane Smith',
      propertyName: 'Mountain Cabin Retreat',
      checkIn: '2024-01-20',
      checkOut: '2024-01-22',
      status: 'pending',
      amount: 320
    }
  ];

  const clientNeeds = [
    {
      id: 1,
      guestName: 'Mike Johnson',
      request: 'Looking for pet-friendly accommodation near the beach',
      date: '2024-01-10',
      status: 'open'
    },
    {
      id: 2,
      guestName: 'Sarah Wilson',
      request: 'Need a quiet place for remote work with good WiFi',
      date: '2024-01-08',
      status: 'responded'
    }
  ];

  // Get tabs based on role
  const getTabs = () => {
    const baseTabs = [
      { id: 'overview', name: 'Overview', icon: ChartBarIcon },
      { id: 'roles', name: 'Manage Roles', icon: Cog6ToothIcon },
      { id: 'payments', name: 'Payment Dashboard', icon: CreditCardIcon },
      { id: 'profile', name: isGuest ? 'Profile Settings' : 'Provider Profile', icon: UserIcon }
    ];

    if (isGuest) {
      return [
        { id: 'overview', name: 'Overview', icon: ChartBarIcon },
        { id: 'bookings', name: 'My Bookings', icon: CalendarDaysIcon },
        { id: 'favorites', name: 'Favorites', icon: StarIcon },
        { id: 'payments', name: 'Payments', icon: CreditCardIcon },
        { id: 'profile', name: 'Profile Settings', icon: Cog6ToothIcon },
      ];
    }

    if (isBnBHost) {
      return [
        ...baseTabs,
        { id: 'properties', name: 'My Properties', icon: HomeIcon },
        { id: 'bookings', name: 'Guest Bookings', icon: CalendarDaysIcon },
        { id: 'reviews', name: 'Guest Reviews', icon: StarIcon }
      ];
    } else if (isHotelRestaurantHost) {
      return [
        ...baseTabs,
        { id: 'establishments', name: 'My Establishments', icon: BuildingOfficeIcon },
        { id: 'bookings', name: 'Reservations', icon: CalendarDaysIcon },
        { id: 'staff', name: 'Staff Management', icon: UsersIcon },
        { id: 'inventory', name: 'Inventory', icon: DocumentTextIcon }
      ];
    } else {
      // Generic host dashboard
      return [
        ...baseTabs,
        { id: 'listings', name: 'Manage Listings', icon: BuildingOfficeIcon },
        { id: 'bookings', name: 'Booking Management', icon: CalendarDaysIcon },
        { id: 'needs', name: 'View Client Needs', icon: EyeIcon }
      ];
    }
  };

  const tabs = getTabs();

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{isGuest ? 'Upcoming Trips' : 'Total Bookings'}</p>
              <p className="text-2xl font-bold text-gray-900">{isGuest ? (guestSummary?.quick_stats?.pending_bookings ?? 0) : stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{isGuest ? 'Outstanding Payments' : 'Total Revenue'}</p>
              <p className="text-2xl font-bold text-gray-900">{isGuest ? (guestSummary?.quick_stats?.pending_bookings_amount ? `$${guestSummary.quick_stats.pending_bookings_amount}` : '$0') : `$${stats.totalRevenue.toLocaleString()}`}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HomeIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{isGuest ? 'Favorites' : 'Active Listings'}</p>
              <p className="text-2xl font-bold text-gray-900">{isGuest ? (guestSummary?.favorites?.length ?? 0) : stats.activeListings}</p>
                  </div>
                </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <StarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{isGuest ? 'Completed Trips' : 'Average Rating'}</p>
              <p className="text-2xl font-bold text-gray-900">{isGuest ? (guestSummary?.quick_stats?.total_bookings ?? 0) : stats.averageRating}</p>
            </div>
          </div>
        </div>
      </div>

          {/* Recent Bookings / Next Trip */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{isGuest ? 'Your Next Trip' : 'Recent Bookings'}</h2>
          {isGuest ? (
            <button 
              onClick={() => setActiveTab('bookings')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
                  Manage Bookings
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('bookings')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
                  View All
            </button>
          )}
            </div>
            {isGuest ? (
              <div className="space-y-3">
                {guestLoading && <p className="text-gray-600">Loading...</p>}
                {guestError && <p className="text-red-600 text-sm">{guestError}</p>}
                {!guestLoading && !guestError && (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Property</p>
                      <p className="text-base font-medium text-gray-900">{guestSummary?.recent_activity?.[0]?.property || '—'}</p>
                      <p className="text-xs text-gray-500">{guestSummary?.upcoming_trips?.[0]?.date || 'No upcoming trip'}</p>
                    </div>
                    <button onClick={() => setActiveTab('bookings')} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">View</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${booking.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        {booking.status === 'confirmed' ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{booking.guestName}</p>
                        <p className="text-xs text-gray-500">{booking.propertyName}</p>
                        <p className="text-xs text-gray-500">{booking.checkIn} - {booking.checkOut}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">${booking.amount}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );

  const renderListings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Listings</h2>
        <Link
          to="/list-hotel"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Listing
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mock listing cards */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">Luxury Beach Villa</h3>
            <p className="text-sm text-gray-600">Malindi, Kenya</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-green-600">Active</span>
              <div className="flex items-center">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-600 ml-1">4.8</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">Mountain Cabin Retreat</h3>
            <p className="text-sm text-gray-600">Nanyuki, Kenya</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-green-600">Active</span>
              <div className="flex items-center">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-600 ml-1">4.6</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">City Center Apartment</h3>
            <p className="text-sm text-gray-600">Nairobi, Kenya</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-yellow-600">Pending</span>
              <div className="flex items-center">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-600 ml-1">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Categorize bookings for guest view
  const categorizeBookings = (bookingsList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categorized = {
      upcoming: [],
      in_progress: [],
      past: [],
      pending: []
    };

    bookingsList.forEach(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      if (booking.status === 'pending') {
        categorized.pending.push(booking);
      } else if (booking.status === 'cancelled') {
        categorized.past.push(booking);
      } else if (checkIn <= today && today < checkOut) {
        categorized.in_progress.push(booking);
      } else if (checkIn > today) {
        categorized.upcoming.push(booking);
      } else {
        categorized.past.push(booking);
      }
    });

    return categorized;
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await bookingsAPI.cancelBooking(bookingId);
      const data = await bookingsAPI.getBookings();
      setBookings(data.results || data || []);
    } catch (err) {
      alert('Failed to cancel booking. Please try again.');
      console.error('Error cancelling booking:', err);
    }
  };

  const renderBookings = () => {
    // Guest bookings view
    if (isGuest) {
      const categorized = categorizeBookings(bookings);
      const displayBookings = bookingFilter === 'all' 
        ? bookings 
        : categorized[bookingFilter] || [];

      const getStatusColor = (status) => {
        switch (status) {
          case 'confirmed': return 'bg-green-100 text-green-800';
          case 'pending': return 'bg-yellow-100 text-yellow-800';
          case 'cancelled': return 'bg-red-100 text-red-800';
          case 'completed': return 'bg-blue-100 text-blue-800';
          default: return 'bg-gray-100 text-gray-800';
        }
      };

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
            <Link
              to="/search"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Book New Stay
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex space-x-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All Bookings', count: bookings.length },
                { id: 'upcoming', label: 'Upcoming', count: categorized.upcoming.length },
                { id: 'in_progress', label: 'In Progress', count: categorized.in_progress.length },
                { id: 'past', label: 'Past Trips', count: categorized.past.length },
                { id: 'pending', label: 'Pending', count: categorized.pending.length }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setBookingFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    bookingFilter === filter.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      bookingFilter === filter.id ? 'bg-white bg-opacity-30' : 'bg-gray-200'
                    }`}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {bookingsLoading ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading bookings...</p>
              </div>
            ) : bookingsError ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-red-600">{bookingsError}</p>
              </div>
            ) : displayBookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600 mb-6">
                  {bookingFilter === 'all' 
                    ? "You haven't made any bookings yet."
                    : `You don't have any ${bookingFilter.replace('_', ' ')} bookings.`}
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Book Your First Stay
                </Link>
              </div>
            ) : (
              displayBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-2 rounded-lg ${
                            booking.status === 'confirmed' || booking.status === 'completed'
                              ? 'bg-green-100'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100'
                              : 'bg-red-100'
                          }`}>
                            {(booking.status === 'confirmed' || booking.status === 'completed') ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            ) : booking.status === 'pending' ? (
                              <ClockIcon className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.room_type?.hotel?.name || 'Hotel'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {booking.room_type?.name || 'Room'} • {booking.room_type?.hotel?.city || ''}, {booking.room_type?.hotel?.country || ''}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Check-in</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(booking.check_in).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Check-out</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(booking.check_out).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Guests</p>
                            <p className="text-sm font-medium text-gray-900">
                              {booking.num_adults} {booking.num_adults > 1 ? 'adults' : 'adult'}
                              {booking.num_children > 0 && `, ${booking.num_children} ${booking.num_children > 1 ? 'children' : 'child'}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-sm font-medium text-gray-900">
                              {booking.currency} {booking.total_amount?.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : booking.payment_status === 'partially_paid'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Payment: {booking.payment_status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => navigate(`/booking/${booking.id}`)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <EyeIcon className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                          >
                            <XMarkIcon className="w-4 h-4 mr-2" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // Host bookings view (existing)
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">All Bookings</button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Pending</button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Confirmed</button>
            </div>
          </div>

          <div className="space-y-3">
            {recentBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  booking.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {booking.status === 'confirmed' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ClockIcon className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.guestName}</p>
                  <p className="text-xs text-gray-500">{booking.propertyName}</p>
                  <p className="text-xs text-gray-500">{booking.checkIn} - {booking.checkOut}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${booking.amount}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  {booking.status === 'pending' && (
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <CheckCircleIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  };

  const renderClientNeeds = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">View Client Needs</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          {clientNeeds.map((need) => (
            <div key={need.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{need.guestName}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    need.status === 'open' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {need.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{need.request}</p>
                <p className="text-xs text-gray-500">Posted on {need.date}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Respond
                </button>
                <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Payment Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">$1,200</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCardIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Next Payout</p>
              <p className="text-2xl font-bold text-gray-900">$850</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Beach Villa Booking</p>
                <p className="text-xs text-gray-500">Jan 15, 2024</p>
              </div>
            </div>
            <p className="text-sm font-medium text-green-600">+$450</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Mountain Cabin Booking</p>
                <p className="text-xs text-gray-500">Jan 20, 2024</p>
              </div>
            </div>
            <p className="text-sm font-medium text-yellow-600">Pending $320</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Provider Profile</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-gray-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.first_name} {user?.last_name}</h3>
            <p className="text-gray-600">Property Host</p>
            <div className="flex items-center mt-2">
              <StarIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-600 ml-1">4.8 average rating</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Profile Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">+254 700 000 000</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900">Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Host Statistics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Bookings</span>
                <span className="text-sm font-medium text-gray-900">{stats.totalBookings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Rate</span>
                <span className="text-sm font-medium text-gray-900">98%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-medium text-gray-900">2 hours</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );

  // Host-specific render functions
  const renderProperties = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
        <Link
          to="/list-hotel"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Property
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mock property cards */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">Cozy Beach House</h3>
            <p className="text-sm text-gray-600">Malindi, Kenya</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-green-600">Active</span>
              <div className="flex items-center">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-600 ml-1">4.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Services</h2>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">City Tours</h3>
              <p className="text-sm text-gray-600">Nairobi City Center</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Guided tours of Nairobi's historic sites and modern attractions.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600">Active</span>
            <span className="text-sm text-gray-600">$50/hour</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEstablishments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Establishments</h2>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Establishment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Grand Hotel Nairobi</h3>
              <p className="text-sm text-gray-600">5 Star Hotel</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rooms:</span>
              <span className="text-sm font-medium text-gray-900">120</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Occupancy:</span>
              <span className="text-sm font-medium text-gray-900">85%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>

          <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Staff Members</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Staff Member
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">John Manager</p>
                <p className="text-xs text-gray-500">Front Desk Manager</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">245</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>

          <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Services</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Service
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">City Tour - Nairobi</p>
                <p className="text-xs text-gray-500">Tomorrow, 9:00 AM</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600">Confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-gray-900">Sarah Johnson</h4>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">"Amazing stay! The property was exactly as described and the host was very responsive."</p>
              <p className="text-xs text-gray-500 mt-2">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Role Management</h2>
            <p className="text-gray-600 mt-1">Manage your roles and switch between different account types</p>
          </div>
          <RoleIndicator showLabel={true} size="md" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Roles */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Roles</h3>
            <div className="space-y-3">
              {user?.roles?.map((role, index) => {
                const roleConfig = {
                  guest: { icon: UserIcon, label: 'Guest', color: 'text-blue-600', bgColor: 'bg-blue-100' },
                  bnb_host: { icon: HomeIcon, label: 'BnB Host', color: 'text-green-600', bgColor: 'bg-green-100' },
                  hotel_host: { icon: BuildingOfficeIcon, label: 'Hotel Host', color: 'text-purple-600', bgColor: 'bg-purple-100' },
                  tour_operator: { icon: MapIcon, label: 'Tour Operator', color: 'text-orange-600', bgColor: 'bg-orange-100' },
                  concierge_host: { icon: SparklesIcon, label: 'Concierge', color: 'text-pink-600', bgColor: 'bg-pink-100' }
                };
                const config = roleConfig[role] || roleConfig.guest;
                const IconComponent = config.icon;
                const isActive = user?.active_role === role;

                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor} ${isActive ? 'ring-2 ring-primary-500' : ''}`}>
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                      <span className={`font-medium ${config.color}`}>{config.label}</span>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Actions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role Actions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Switch Role</h4>
                <RoleSwitcher />
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Role</h4>
                <p className="text-xs text-gray-500 mb-3">Add additional roles to expand your capabilities on the platform</p>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Request New Role
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Role Information */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">About Roles</h3>
          <p className="text-sm text-blue-800">
            Roles allow you to access different features and dashboards on the platform. You can have multiple roles and switch between them as needed. 
            Each role provides access to specific tools and functionalities tailored to that type of business.
          </p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'favorites':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Favorites</h2>
            <FavoritesSection />
          </div>
        );
      case 'roles':
        return renderRoles();
      case 'listings':
        return renderListings();
      case 'bookings':
        return renderBookings();
      case 'needs':
        return renderClientNeeds();
      case 'payments':
        return renderPayments();
      case 'profile':
        return renderProfile();
      // Host-specific tabs
      case 'properties':
        return renderProperties();
      case 'services':
        return renderServices();
      case 'establishments':
        return renderEstablishments();
      case 'staff':
        return renderStaff();
      case 'inventory':
        return renderInventory();
      case 'schedule':
        return renderSchedule();
      case 'reviews':
        return renderReviews();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isGuest ? 'Guest Dashboard' : (isBnBHost ? 'BnB Host Dashboard' : 
             isHotelRestaurantHost ? 'Hotel/Restaurant Dashboard' : 
             'Provider Dashboard')}
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.first_name}! {isGuest ? 'Plan and manage your trips, payments, and favorites.' : (isBnBHost ? 'Manage your properties and guest bookings.' :
             isHotelRestaurantHost ? 'Manage your establishments and reservations.' :
             'Manage your properties and bookings.')}
          </p>
          
          {/* Role Management Section */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Current Role:</span>
              <RoleIndicator showLabel={true} size="sm" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Switch Role:</span>
              <RoleSwitcher />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardPage;
