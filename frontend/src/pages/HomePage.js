import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import HostHomePage from './HostHomePage';
import { 
  CalendarIcon,
  StarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  HeartIcon,
  ArrowRightIcon,
  SparklesIcon,
  UserGroupIcon,
  HomeIcon,
  FireIcon,
  ClockIcon,
  PlusIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';
import FeaturedHotels from '../components/hotel/FeaturedHotels';
import RoleBasedNavigationDemo from '../components/RoleBasedNavigationDemo';

const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hasApiListings, setHasApiListings] = useState(false);
  const [checkingListings, setCheckingListings] = useState(false);

  // Check if user is in host mode and show HostHomePage
  const isHostMode = user?.active_role && user.active_role !== 'guest';
  
  // Also check if user has host roles even if active_role is not set
  const hasHostRoles = user?.roles && user.roles.some(role => ['bnb_host', 'hotel_host'].includes(role));
  const shouldShowHostPage = isHostMode || hasHostRoles || hasApiListings;

  // API-based listing check (hotels and BnB) so we don't depend on localStorage
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      if (!isAuthenticated || !user) return;
      setCheckingListings(true);
      try {
        const { listingsAPI, bnbAPI } = await import('../services/api');
        const [hotels, bnbs] = await Promise.all([
          listingsAPI.getUserListings().catch(() => ({ results: [] })),
          bnbAPI.getMyListings().catch(() => ({ results: [] })),
        ]);
        const hotelCount = (hotels?.results || hotels || []).length;
        const bnbCount = (bnbs?.results || bnbs || []).length;
        if (isMounted) setHasApiListings(hotelCount + bnbCount > 0);
      } finally {
        if (isMounted) setCheckingListings(false);
      }
    };
    check();
    return () => { isMounted = false; };
  }, [isAuthenticated, user]);

  const handleListHotelClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const { listingsAPI } = await import('../services/api');
      const data = await listingsAPI.getUserListings();
      const mine = data?.results || data || [];
      if (mine.length > 0) {
        navigate('/host-dashboard');
      } else {
        try { localStorage.setItem('intendedHostType', 'hotel_restaurant'); } catch (_) {}
        navigate('/host/home');
      }
    } catch (_) {
      try { localStorage.setItem('intendedHostType', 'hotel_restaurant'); } catch (_) {}
      navigate('/host/home');
    }
  };

  const handleListBnBClick = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const { bnbAPI } = await import('../services/api');
      const data = await bnbAPI.getMyListings();
      const mine = data?.results || data || [];
      if (mine.length > 0) {
        navigate('/host/bnb');
      } else {
        try { localStorage.setItem('intendedHostType', 'bnb'); } catch (_) {}
        navigate('/host/home');
      }
    } catch (_) {
      try { localStorage.setItem('intendedHostType', 'bnb'); } catch (_) {}
      navigate('/host/home');
    }
  };
  
  if (shouldShowHostPage) {
    return <HostHomePage />;
  }


  const features = [
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: 'Verified & Safe',
      description: 'Every listing is verified and hosts are background-checked for your safety.',
      color: 'text-red-600'
    },
    {
      icon: <SparklesIcon className="w-8 h-8" />,
      title: 'Premium Quality',
      description: 'Curated selection of the best accommodations and experiences.',
      color: 'text-red-600'
    },
    {
      icon: <GlobeAltIcon className="w-8 h-8" />,
      title: 'Local Expertise',
      description: 'Authentic experiences curated by locals who know their destinations.',
      color: 'text-red-600'
    },
    {
      icon: <HeartIcon className="w-8 h-8" />,
      title: '24/7 Support',
      description: 'Round-the-clock assistance for seamless travel experiences.',
      color: 'text-red-600'
    }
  ];


  const destinations = [
    {
      name: 'Nairobi',
      country: 'Kenya',
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=500&h=350&fit=crop&crop=center',
      rating: 4.8,
      price: 'From KES 2,500',
      properties: '1,200+ properties'
    },
    {
      name: 'Mombasa',
      country: 'Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=350&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 3,200',
      properties: '800+ properties'
    },
    {
      name: 'Kisumu',
      country: 'Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=350&fit=crop&crop=center',
      rating: 4.7,
      price: 'From KES 2,800',
      properties: '450+ properties'
    },
    {
      name: 'Zanzibar',
      country: 'Tanzania',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=350&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 4,500',
      properties: '600+ properties'
    }
  ];

  // Dynamic Content Sections Data
  const trendingNow = [
    {
      name: 'Maasai Mara',
      country: 'Kenya',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 8,500',
      originalPrice: 'KES 12,000',
      discount: '29% off',
      bookings: '127 bookings this month'
    },
    {
      name: 'Serengeti',
      country: 'Tanzania',
      image: 'https://images.unsplash.com/photo-1506905925346-14b1e0d0b6b3?w=400&h=300&fit=crop&crop=center',
      rating: 4.8,
      price: 'From KES 15,000',
      originalPrice: 'KES 20,000',
      discount: '25% off',
      bookings: '89 bookings this month'
    },
    {
      name: 'Victoria Falls',
      country: 'Zambia',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.7,
      price: 'From KES 6,200',
      originalPrice: 'KES 8,500',
      discount: '27% off',
      bookings: '156 bookings this month'
    },
    {
      name: 'Cape Town',
      country: 'South Africa',
      image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 4,800',
      originalPrice: 'KES 6,500',
      discount: '26% off',
      bookings: '203 bookings this month'
    }
  ];

  const lastMinuteDeals = [
    {
      name: 'Luxury Beach Villa',
      location: 'Diani Beach, Kenya',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&crop=center',
      rating: 4.8,
      price: 'KES 12,000',
      originalPrice: 'KES 25,000',
      discount: '52% off',
      timeLeft: '2 days left',
      guests: '8 guests'
    },
    {
      name: 'Mountain Lodge',
      location: 'Mount Kenya, Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.6,
      price: 'KES 8,500',
      originalPrice: 'KES 15,000',
      discount: '43% off',
      timeLeft: '5 days left',
      guests: '4 guests'
    },
    {
      name: 'City Center Apartment',
      location: 'Nairobi CBD, Kenya',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&crop=center',
      rating: 4.7,
      price: 'KES 3,200',
      originalPrice: 'KES 5,500',
      discount: '42% off',
      timeLeft: '1 day left',
      guests: '2 guests'
    },
    {
      name: 'Safari Camp',
      location: 'Amboseli, Kenya',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'KES 18,000',
      originalPrice: 'KES 30,000',
      discount: '40% off',
      timeLeft: '3 days left',
      guests: '6 guests'
    }
  ];

  const newlyAdded = [
    {
      name: 'Modern Loft',
      location: 'Westlands, Nairobi',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 4,500',
      addedDate: '2 days ago',
      host: 'Sarah M.',
      verified: true
    },
    {
      name: 'Beachfront Cottage',
      location: 'Malindi, Kenya',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&crop=center',
      rating: 4.8,
      price: 'From KES 7,200',
      addedDate: '1 day ago',
      host: 'Ahmed K.',
      verified: true
    },
    {
      name: 'Garden Villa',
      location: 'Karen, Nairobi',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center',
      rating: 4.7,
      price: 'From KES 6,800',
      addedDate: '3 days ago',
      host: 'Grace W.',
      verified: true
    },
    {
      name: 'Historic House',
      location: 'Stone Town, Zanzibar',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 5,500',
      addedDate: '1 day ago',
      host: 'Omar S.',
      verified: true
    }
  ];

  const localFavorites = [
    {
      name: 'Hidden Gem Villa',
      location: 'Kilifi, Kenya',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 9,500',
      host: 'Local Expert',
      recommendation: 'Perfect for sunset views',
      verified: true
    },
    {
      name: 'Cultural Homestay',
      location: 'Lamu, Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.8,
      price: 'From KES 3,800',
      host: 'Local Expert',
      recommendation: 'Authentic Swahili experience',
      verified: true
    },
    {
      name: 'Mountain Retreat',
      location: 'Aberdare, Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.7,
      price: 'From KES 11,200',
      host: 'Local Expert',
      recommendation: 'Best for nature lovers',
      verified: true
    },
    {
      name: 'Lakeside Cabin',
      location: 'Naivasha, Kenya',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center',
      rating: 4.9,
      price: 'From KES 6,500',
      host: 'Local Expert',
      recommendation: 'Peaceful and serene',
      verified: true
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'Nairobi',
      rating: 5,
      text: 'Msafiri Space made my trip to Kenya absolutely magical. The villa was perfect and the local experiences were unforgettable.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'David Chen',
      location: 'Mombasa',
      rating: 5,
      text: 'Incredible beachfront property with amazing hosts. The attention to detail and local recommendations were spot on.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Maria Rodriguez',
      location: 'Kisumu',
      rating: 5,
      text: 'A truly authentic African experience. The hosts were welcoming and the property exceeded all expectations.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Booking.com Inspired */}
      <section className="relative bg-gradient-to-b from-red-600 via-red-700 to-red-800 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl lg:text-6xl font-bold text-white mb-4"
            >
              Find your next stay
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto"
            >
              Search deals on hotels, homes, and much more...
            </motion.p>
            
          </div>
          
          {/* Enhanced Search Bar - Premium Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 items-center">
                {/* Where */}
                <div className="lg:col-span-1 relative group">
                  <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition-all duration-200 cursor-pointer">
                    <div className="flex-shrink-0">
                      <HomeIcon className="w-7 h-7 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Where are you going?</label>
                      <input
                        type="text"
                        placeholder="Search destinations"
                        className="w-full text-lg text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
                      />
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-12 bg-gray-200 hidden lg:block"></div>
                </div>
                
                {/* Dates */}
                <div className="lg:col-span-1 relative group">
                  <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition-all duration-200 cursor-pointer">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="w-7 h-7 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in — Check-out</label>
                      <input
                        type="text"
                        placeholder="Select dates"
                        className="w-full text-lg text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-12 bg-gray-200 hidden lg:block"></div>
                </div>
                
                {/* Guests */}
                <div className="lg:col-span-1 relative group">
                  <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl transition-all duration-200 cursor-pointer">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="w-7 h-7 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Guests & Rooms</label>
                      <input
                        type="text"
                        placeholder="2 adults · 0 children · 1 room"
                        className="w-full text-lg text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-12 bg-gray-200 hidden lg:block"></div>
                </div>
                
                {/* Search Button */}
                <div className="lg:col-span-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Search</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Add Listing Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-8"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-white mb-3">Are you a property owner?</h3>
              <p className="text-white/80 mb-6">List your hotel or BnB and start earning from travelers worldwide</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleListHotelClick}
                  className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  <HomeIcon className="w-5 h-5" />
                  <span>List Your Hotel</span>
                </button>
                <button
                  onClick={handleListBnBClick}
                  className="bg-white/20 text-white hover:bg-white/30 px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 border border-white/30"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>List Your BnB</span>
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-8"
          >
            <div className="flex flex-wrap justify-center items-center space-x-6 text-white/80">
              <span className="text-sm">Popular:</span>
              <button className="text-sm hover:text-white transition-colors duration-200">Nairobi</button>
              <button className="text-sm hover:text-white transition-colors duration-200">Mombasa</button>
              <button className="text-sm hover:text-white transition-colors duration-200">Kisumu</button>
              <button className="text-sm hover:text-white transition-colors duration-200">Zanzibar</button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Verified & Safe</h3>
              <p className="text-xs text-gray-600 mt-1">Every listing verified</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                <HeartIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">24/7 Support</h3>
              <p className="text-xs text-gray-600 mt-1">Always here to help</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Premium Quality</h3>
              <p className="text-xs text-gray-600 mt-1">Curated experiences</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                <GlobeAltIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Local Expertise</h3>
              <p className="text-xs text-gray-600 mt-1">Authentic experiences</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">What are you looking for?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-center group"
            >
              <HomeIcon className="w-8 h-8 mx-auto mb-3 text-red-600 group-hover:text-red-700" />
              <h3 className="font-semibold text-gray-900">Places to Stay</h3>
              <p className="text-sm text-gray-600 mt-1">Homes, hotels & more</p>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-center group"
            >
              <GlobeAltIcon className="w-8 h-8 mx-auto mb-3 text-red-600 group-hover:text-red-700" />
              <h3 className="font-semibold text-gray-900">Experiences</h3>
              <p className="text-sm text-gray-600 mt-1">Tours & activities</p>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-center group"
            >
              <SparklesIcon className="w-8 h-8 mx-auto mb-3 text-red-600 group-hover:text-red-700" />
              <h3 className="font-semibold text-gray-900">Concierge</h3>
              <p className="text-sm text-gray-600 mt-1">Extra services</p>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-center group"
            >
              <ShieldCheckIcon className="w-8 h-8 mx-auto mb-3 text-red-600 group-hover:text-red-700" />
              <h3 className="font-semibold text-gray-900">Become a Host</h3>
              <p className="text-sm text-gray-600 mt-1">Share your space</p>
            </motion.button>
          </div>
        </div>
      </section>

      {/* Dynamic Content Sections */}
      
      {/* Trending Now Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center mb-4">
              <FireIcon className="w-8 h-8 text-red-600 mr-3" />
              <h2 className="text-4xl lg:text-5xl font-bold text-black">
                Trending Now
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover the most popular destinations this month based on bookings and traveler reviews.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingNow.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-white">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {item.discount}
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{item.rating}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-black">{item.name}</h3>
                      <span className="text-sm text-gray-500">{item.country}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg font-semibold text-red-600">{item.price}</span>
                      <span className="text-sm text-gray-500 line-through">{item.originalPrice}</span>
                    </div>
                    <p className="text-sm text-gray-600">{item.bookings}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Last Minute Deals Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center mb-4">
              <ClockIcon className="w-8 h-8 text-red-600 mr-3" />
              <h2 className="text-4xl lg:text-5xl font-bold text-black">
                Last Minute Deals
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Don't miss out on these incredible flash sales! Limited time offers with massive discounts.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {lastMinuteDeals.map((deal, index) => (
              <motion.div
                key={deal.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-white">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {deal.discount}
                  </div>
                  <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {deal.timeLeft}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{deal.rating}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{deal.name}</h3>
                    <p className="text-gray-600 mb-2">{deal.location}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-red-600">{deal.price}</span>
                      <span className="text-sm text-gray-500 line-through">{deal.originalPrice}</span>
                    </div>
                    <p className="text-sm text-gray-600">{deal.guests}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newly Added Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center mb-4">
              <PlusIcon className="w-8 h-8 text-red-600 mr-3" />
              <h2 className="text-4xl lg:text-5xl font-bold text-black">
                Newly Added
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Fresh listings just added to our platform. Be among the first to discover these amazing places!
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {newlyAdded.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-white">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    NEW
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{item.rating}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{item.name}</h3>
                    <p className="text-gray-600 mb-2">{item.location}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-red-600">{item.price}</span>
                      <span className="text-sm text-gray-500">{item.addedDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Host: {item.host}</span>
                      {item.verified && (
                        <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Favorites Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center mb-4">
              <HandThumbUpIcon className="w-8 h-8 text-red-600 mr-3" />
              <h2 className="text-4xl lg:text-5xl font-bold text-black">
                Local Favorites
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Handpicked by our local experts. These hidden gems offer authentic experiences you won't find anywhere else.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {localFavorites.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-white">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    LOCAL PICK
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{item.rating}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{item.name}</h3>
                    <p className="text-gray-600 mb-2">{item.location}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-red-600">{item.price}</span>
                      <span className="text-sm text-gray-500">{item.host}</span>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{item.recommendation}"</p>
                    {item.verified && (
                      <div className="flex items-center mt-2">
                        <ShieldCheckIcon className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xs text-green-600 font-medium">Verified Local Expert</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              Why Choose Msafiri Space?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We're committed to providing you with the best travel experience possible, 
              from verified listings to secure payments and exceptional support.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
              >
                <div className={`w-20 h-20 mx-auto mb-6 ${feature.color} flex items-center justify-center rounded-2xl bg-red-50 group-hover:bg-red-100 transition-colors duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-black mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Explore some of our most loved destinations and start planning your next adventure.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {destinations.map((destination, index) => (
              <motion.div
                key={destination.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 bg-white">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold text-sm">{destination.rating}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-black">{destination.name}</h3>
                      <span className="text-sm text-gray-500">{destination.country}</span>
                    </div>
                    <p className="text-lg font-semibold text-red-600 mb-2">{destination.price}</p>
                    <p className="text-sm text-gray-600">{destination.properties}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link
              to="/search"
              className="inline-flex items-center px-10 py-4 bg-black hover:bg-gray-800 text-white text-lg font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              View All Destinations
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Role-Based Navigation Demo */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RoleBasedNavigationDemo />
        </div>
      </section>

      {/* Featured Hotels Section */}
      <FeaturedHotels />

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-black mb-6">
              What Our Travelers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Don't just take our word for it - hear from travelers who've experienced the magic of Msafiri Space.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-2xl p-8 group hover:bg-white hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-black">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.location}</p>
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic">"{testimonial.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of travelers who have discovered amazing places and unforgettable experiences 
              through Msafiri Space.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/register"
                  className="inline-flex items-center px-10 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Get Started Today
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/search"
                  className="inline-flex items-center px-10 py-4 bg-transparent text-white text-lg font-semibold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-all duration-200"
                >
                  Explore Listings
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
