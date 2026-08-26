import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeModernIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const HostHomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // All hooks must be called unconditionally at the top level
  const [hasListings, setHasListings] = useState(false);
  const [hasHotel, setHasHotel] = useState(false);
  const [hasBnB, setHasBnB] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [showListingChoice, setShowListingChoice] = useState(false);

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

  // If user is explicitly in guest role, redirect to home
  useEffect(() => {
    if (user?.active_role === 'guest') {
      navigate('/', { replace: true });
    }
  }, [user?.active_role, navigate]);

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

  // If user is in guest role, show loading while redirecting
  if (user?.active_role === 'guest') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleGetStarted = () => {
    setShowListingChoice(true);
  };

  const handleChooseListingType = (type) => {
    setShowListingChoice(false);
    if (type === 'hotel') {
      navigate('/become-host/hotel-restaurant');
      return;
    }
    navigate('/become-host/bnb');
  };

  const handleGoToDashboard = () => {
    if (hasHotel) {
      navigate('/host-dashboard');
      return;
    }
    if (hasBnB) {
      navigate('/host/bnb');
      return;
    }
    navigate('/host-dashboard');
  };

  const handleBoostVisibility = () => {
    // For now, take hosts to the promotions area where we’ll later plug in
    // a full payment + configuration flow for featured listings.
    navigate('/promotions');
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
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <button
                    onClick={handleGoToDashboard}
                    className="px-8 py-4 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center shadow-xl"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </button>
                </motion.div>

                {/* Minimal dashboard shortcut buttons just below the main CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="mt-4 flex flex-wrap items-center justify-center gap-3"
                >
                  <button
                    onClick={() => navigate('/host-dashboard')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>Hotel dashboard</span>
                  </button>
                  <button
                    onClick={() => navigate('/host/bnb')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <HomeModernIcon className="h-4 w-4" />
                    <span>BnB dashboard</span>
                  </button>
                </motion.div>
              </>
            )}
        {showListingChoice && (
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleChooseListingType('bnb')}
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center shadow"
            >
              List a BnB
            </button>
            <button
              onClick={() => handleChooseListingType('hotel')}
              className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center shadow"
            >
              List a Hotel
            </button>
          </div>
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

      {/* Boost visibility section for hosts who already have listings */}
      {hasListings && (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-black mb-3">
                Boost your visibility
              </h2>
              <p className="text-lg md:text-xl text-gray-700">
                Promotions, deals, and special offers designed to get your listings in front of more travelers.
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:items-center">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                  Launch visibility offer
                </p>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Get featured at the top of search
                </h3>
                <p className="text-sm text-gray-700 mb-4 max-w-xl">
                  Highlight one of your listings in the featured carousel and “Top Picks for Today” sections.
                  Ideal for new properties, low season, or when you want an extra push.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Featured badge</p>
                      <p className="text-gray-600">
                        Your listing appears with a “Featured” tag in key discovery sections.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Priority placement</p>
                      <p className="text-gray-600">
                        Higher ranking when travelers search in your city or region.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Smart insights</p>
                      <p className="text-gray-600">
                        See extra views and bookings your boost generated in your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto md:min-w-[240px]">
                <div className="bg-white/80 backdrop-blur rounded-xl border border-amber-200 p-5 shadow-md flex flex-col h-full">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                    Intro pricing
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    KES 2,500
                    <span className="text-sm font-medium text-gray-500 ml-1">/ 7 days</span>
                  </p>
                  <p className="text-xs text-gray-600 mb-4">
                    Flat fee per boosted listing. Cancel or switch listings between campaigns later.
                  </p>
                  <button
                    type="button"
                    onClick={handleBoostVisibility}
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold shadow hover:bg-amber-600 transition-colors"
                  >
                    Explore boost options
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </button>
                  <p className="mt-3 text-[11px] text-gray-500 leading-snug">
                    No long‑term commitment. You’ll review and confirm the final price before any payment is made.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HostHomePage;
