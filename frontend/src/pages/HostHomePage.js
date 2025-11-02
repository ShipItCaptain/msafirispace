import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeModernIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  StarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  SparklesIcon as StarSparkleIcon,
  MapPinIcon,
  DocumentCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const HostHomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [hasListings, setHasListings] = useState(false);
  const [hasHotel, setHasHotel] = useState(false);
  const [hasBnB, setHasBnB] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Check if user has any listings
  useEffect(() => {
    const checkListings = async () => {
      if (!isAuthenticated || !user) {
        setLoadingCheck(false);
        return;
      }

      // Mark that user has visited host home
      if (user.active_role) {
        localStorage.setItem(`hasVisitedHostHome_${user.active_role}`, 'true');
      }

      try {
        // Check for hotels owned by current user (backend filters by request.user)
        const listingsAPI = (await import('../services/api')).listingsAPI;
        const hotelsResponse = await listingsAPI.getUserListings();
        const userHotels = hotelsResponse?.results || hotelsResponse || [];

        const userHasHotel = (userHotels?.length || 0) > 0;

        // Check BnB listings via API (current user's listings)
        let userHasBnB = false;
        try {
          const { bnbAPI } = await import('../services/api');
          const myBnB = await bnbAPI.getMyListings();
          const bnbList = myBnB?.results || myBnB || [];
          userHasBnB = (bnbList?.length || 0) > 0;
        } catch (_) {
          userHasBnB = false;
        }

        setHasHotel(userHasHotel);
        setHasBnB(userHasBnB);
        setHasListings(userHasHotel || userHasBnB);
      } catch (error) {
        console.error('Error checking listings:', error);
        setHasHotel(false);
        setHasBnB(false);
        setHasListings(false);
      } finally {
        setLoadingCheck(false);
      }
    };

    checkListings();
  }, [user, isAuthenticated]);

  if (isLoading || loadingCheck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access your host dashboard</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const handleGetStarted = async () => {
    // If we already computed presence, route immediately
    if (hasHotel) {
      navigate('/host-dashboard');
      return;
    }
    if (hasBnB) {
      navigate('/host/bnb');
      return;
    }

    // As a fallback, re-check quickly (in case state is stale)
    try {
      const { listingsAPI, bnbAPI } = await import('../services/api');
      const hotelsResponse = await listingsAPI.getListings();
      const userHotels = hotelsResponse.results?.filter(hotel => String(hotel.host) === String(user?.id)) || [];
      if (userHotels.length > 0) {
        navigate('/host-dashboard');
        return;
      }
      const myBnB = await bnbAPI.getMyListings();
      const bnbList = myBnB?.results || myBnB || [];
      if ((bnbList?.length || 0) > 0) {
        navigate('/host/bnb');
        return;
      }
    } catch (_) {
      // ignore and continue to onboarding
    }

    // Direct the user to the appropriate onboarding form based on active role/roles
    // If user came from BecomeHost selection, respect the intended type
    let intended = null;
    try { intended = localStorage.getItem('intendedHostType'); } catch (_) {}

    const activeRole = user?.active_role;
    const roles = user?.roles || [];
    if (intended === 'hotel_restaurant' || activeRole === 'hotel_host' || roles.includes('hotel_host')) {
      navigate('/become-host/hotel-restaurant');
      try { localStorage.removeItem('intendedHostType'); } catch (_) {}
      return;
    }
    if (intended === 'bnb' || activeRole === 'bnb_host' || roles.includes('bnb_host')) {
      navigate('/become-host/bnb');
      try { localStorage.removeItem('intendedHostType'); } catch (_) {}
      return;
    }
    // Default onboarding hub
    navigate('/become-host');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Social Proof Bar */}
            {!hasListings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <button className="mb-8 inline-flex items-center px-6 py-3 bg-white text-red-600 hover:bg-red-50 rounded-full font-semibold transition-colors shadow-lg">
                  <span>Join 12,842 other hosts already on Msafiri Space</span>
                </button>
              </motion.div>
            )}

            {hasListings ? (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Welcome back, {user.first_name || user.username || 'Host'}!
                </h1>
                <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
                  You're already on Msafiri Space. Manage your properties and grow your business.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-5xl font-bold mb-6">
                  Welcome back, {user.first_name || user.username || 'Host'}!
                </h1>
                <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
                  You do not have any listed property yet. List your property now to start earning.
                </p>
              </>
            )}

            {/* Key Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <div className="flex items-start space-x-3 bg-white/10 backdrop-blur rounded-lg p-4">
                <CheckCircleIcon className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">45% of hosts get their first booking</p>
                  <p className="text-sm text-red-100">within a week</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-white/10 backdrop-blur rounded-lg p-4">
                <CheckCircleIcon className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">Choose instant bookings</p>
                  <p className="text-sm text-red-100">or Request to Book</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 bg-white/10 backdrop-blur rounded-lg p-4">
                <CheckCircleIcon className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <div className="text-left">
                  <p className="font-semibold">We'll facilitate</p>
                  <p className="text-sm text-red-100">payments for you</p>
                </div>
              </div>
            </div>

            {!hasListings ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center shadow-xl"
                >
                  Get started now
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
                <button
                  onClick={() => navigate('/become-host')}
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  Learn more
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={() => navigate('/host-dashboard')}
                  className="px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center shadow-xl"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {!hasListings && (
        <>
          {/* Statistics Section */}
          <div className="bg-gray-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Reach a unique global customer base</h2>
                <p className="text-xl text-gray-600">Join a community of travelers seeking authentic African experiences</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-center"
                >
                  <div className="text-5xl font-bold text-red-600 mb-4">2.3M+</div>
                  <p className="text-lg text-gray-900">vacation rental guests since 2020</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-center"
                >
                  <div className="text-5xl font-bold text-red-600 mb-4">1 in every 4</div>
                  <p className="text-lg text-gray-900">room nights booked in 2024 was a vacation rental</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-center"
                >
                  <div className="text-5xl font-bold text-red-600 mb-4">52%</div>
                  <p className="text-lg text-gray-900">of nights booked were for international stays</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-4xl font-bold text-black mb-4">Take control of your finances with Payments by Msafiri Space</h2>
                </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">Payments made easy</h3>
                    <p className="text-gray-900">We facilitate the payment process for you, freeing up your time to grow your business.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">Greater revenue security</h3>
                    <p className="text-gray-900">Whenever guests complete prepaid reservations at your property and pay online, you're guaranteed payment.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">More control over your cash flow</h3>
                    <p className="text-gray-900">Choose payout method and timing based on regional availability.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">Daily payouts in select markets</h3>
                    <p className="text-gray-900">Get payouts faster! We'll send your payouts 24 hours after guests check out.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">One-stop solution for multiple listings</h3>
                    <p className="text-gray-900">Save time managing finances with <span className="font-semibold text-red-600">group invoicing</span> and <span className="font-semibold text-red-600">reconciliation</span>.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex items-start space-x-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-2">Reduced risk</h3>
                    <p className="text-gray-900">We help you stay compliant with regulatory changes and <span className="font-semibold text-red-600">reduce the risk</span> of fraud and chargebacks.</p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mt-12 text-center"
              >
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
                >
                  Start earning today
                </button>
              </motion.div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-gradient-to-b from-gray-50 to-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-4xl font-bold text-black mb-4">Features that help you succeed</h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <GlobeAltIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Global Reach</h3>
                  <p className="text-gray-900">Reach customers from around the world on one of the most downloaded travel apps.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <ShieldCheckIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Host worry-free</h3>
                  <p className="text-gray-900">We've got your back with 24/7 support and automatic damage protection.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <CreditCardIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Easy Payments</h3>
                  <p className="text-gray-900">Get paid securely and on time with our streamlined payment system.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <DevicePhoneMobileIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Mobile Management</h3>
                  <p className="text-gray-900">Manage your listings, bookings, and messages on the go with our mobile app.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <ChartBarIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Detailed Analytics</h3>
                  <p className="text-gray-900">Track your performance, revenue, and guest reviews with comprehensive analytics.</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="bg-white rounded-lg p-6 shadow-sm"
                >
                  <DocumentCheckIcon className="h-12 w-12 text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">Smart Listing</h3>
                  <p className="text-gray-900">Connect from other travel sites and avoid double-bookings with calendar sync.</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl font-bold mb-6">Host worry-free. We've got your back.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <div className="text-3xl mb-2">🏡</div>
                    <p className="text-lg font-semibold">Your rental, your rules</p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">👥</div>
                    <p className="text-lg font-semibold">Get to know your guests</p>
                  </div>
                  <div>
                    <div className="text-3xl mb-2">🛡️</div>
                    <p className="text-lg font-semibold">Stay protected</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/become-host')}
                  className="px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-xl inline-flex items-center"
                >
                  List your property now
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </button>
              </motion.div>
            </div>
          </div>
        </>
      )}

      {/* Dashboard Access Section (if has listings) */}
      {hasListings && (
          <div className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-black mb-4">Welcome back, {user.first_name || 'Host'}!</h2>
                <p className="text-xl text-gray-900">You're already on Msafiri Space. Manage your properties and grow your business.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => navigate('/host-dashboard')}
                  className="bg-red-600 text-white rounded-lg p-6 hover:bg-red-700 transition-colors text-left"
                >
                  <BuildingOfficeIcon className="h-8 w-8 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Hotel Dashboard</h3>
                  <p className="text-red-100">Manage your hotels and bookings</p>
                </button>

                <button
                  onClick={() => navigate('/host/bnb')}
                  className="bg-gray-800 text-white rounded-lg p-6 hover:bg-black transition-colors text-left"
                >
                  <HomeModernIcon className="h-8 w-8 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">BnB Dashboard</h3>
                  <p className="text-gray-300">Manage your BnB properties</p>
                </button>

                {/* concierge dashboard removed */}
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default HostHomePage;
