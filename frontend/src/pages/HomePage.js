import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import HostHomePage from './HostHomePage';
import { 
  CalendarIcon,
  StarIcon,
  ArrowRightIcon,
  UserGroupIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import FeaturedHotels from '../components/hotel/FeaturedHotels';
import FeaturedBnBs from '../components/bnb/FeaturedBnBs';

const HomePage = () => {
  const { user } = useAuth();

  // Only show host home when the currently active role is a host role.
  // Using "has host roles" here can cause a redirect loop for users
  // who have host roles but are currently browsing as guest.
  const isHostMode = user?.active_role && user.active_role !== 'guest';
  const shouldShowHostPage = Boolean(isHostMode);

  if (shouldShowHostPage) {
    return <HostHomePage />;
  }


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
      <section className="relative bg-gradient-to-b from-red-600 via-red-700 to-red-800 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
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
            className="mx-auto w-full max-w-5xl px-4 sm:px-6"
          >
            {/* Compact Booking.com–style search bar */}
            <div className="bg-white rounded-xl shadow-md border border-yellow-400/70">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 items-stretch">
                {/* Where */}
                <div className="lg:col-span-1 relative group">
                  <div className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                    <div className="flex-shrink-0">
                      <HomeIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Where are you going?</label>
                      <input
                        type="text"
                        placeholder="Search destinations"
                        className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
                      />
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-12 bg-gray-200 hidden lg:block"></div>
                </div>
                
                {/* Dates */}
                <div className="lg:col-span-1 relative group">
                  <div className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Check-in — Check-out</label>
                      <input
                        type="text"
                        placeholder="Select dates"
                        className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
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
                  <div className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Guests & Rooms</label>
                      <input
                        type="text"
                        placeholder="2 adults · 0 children · 1 room"
                        className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent border-none"
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
                    className="w-full h-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-0 px-6 rounded-none lg:rounded-r-xl font-semibold text-base transition-all duration-200"
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

      {/* Real listings sections */}
      <FeaturedHotels />
      <FeaturedBnBs />

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
