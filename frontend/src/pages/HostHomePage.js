import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeModernIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowRightIcon,
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
      
      {/* Status banner -- compact, not a landing-page hero. A returning,
          logged-in host checking their dashboard doesn't need a full-bleed
          marketing screen every time. */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mx-auto mb-4 w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Welcome back, {user.first_name || user.username || 'Host'}
            </h1>
            <p className="mt-2 text-gray-600">
              {hasListings
                ? 'Manage your properties and grow your business.'
                : 'List your first property to start earning.'}
            </p>

            {!hasListings ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleGetStarted}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                >
                  Get started
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/become-host')}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Learn more
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleGoToDashboard}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => navigate('/host-dashboard')}
                    className="inline-flex items-center gap-1.5 font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <BuildingOfficeIcon className="h-4 w-4" />
                    Hotel dashboard
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={() => navigate('/host/bnb')}
                    className="inline-flex items-center gap-1.5 font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <HomeModernIcon className="h-4 w-4" />
                    BnB dashboard
                  </button>
                </div>
              </div>
            )}

            {showListingChoice && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => handleChooseListingType('bnb')}
                  className="px-5 py-2.5 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  List a BnB
                </button>
                <button
                  onClick={() => handleChooseListingType('hotel')}
                  className="px-5 py-2.5 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
          {/* Analytics highlight -- the one claim here backed by a real, already-built dashboard feature */}
          <div className="bg-gradient-to-b from-gray-50 to-white py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <ChartBarIcon className="h-12 w-12 text-red-600 mb-4 mx-auto" />
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">Know how your properties are doing</h2>
                <p className="text-gray-700 mb-8">
                  Your dashboard tracks monthly revenue, occupancy, and booking status as they happen,
                  with one-click CSV or Excel export whenever you need the numbers elsewhere.
                </p>
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
                >
                  Start earning today
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
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">
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
