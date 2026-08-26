import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BuildingOfficeIcon, 
  HomeModernIcon, 
  CheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const BecomeHostPage = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const hostTypes = [
    {
      id: 'hotel_restaurant',
      title: 'Hotel/Restaurant Host',
      description: 'List your hotel or restaurant and offer accommodation and dining services to travelers.',
      icon: BuildingOfficeIcon,
      features: [
        'Manage room bookings and restaurant reservations',
        'Set pricing and availability',
        'Handle guest reviews and ratings',
        'Access to hospitality management tools',
        'Marketing and promotion support'
      ],
      color: 'blue',
      route: '/list-hotel'
    },
    {
      id: 'bnb',
      title: 'BnB Host',
      description: 'Share your home or property with travelers looking for authentic local experiences.',
      icon: HomeModernIcon,
      features: [
        'List your property with photos and amenities',
        'Set your own house rules and pricing',
        'Direct communication with guests',
        'Flexible hosting schedule',
        'Local experience sharing'
      ],
      color: 'green',
      route: '/become-host/bnb'
    }
  ];

  const handleTypeSelection = (type) => {
    setSelectedType(type);
  };

  const handleContinue = async () => {
    if (!selectedType) return;

    // For Hotel/Restaurant Host, check if user has existing listings
    if (selectedType.id === 'hotel_restaurant') {
      setIsChecking(true);
      try {
        // Check if user has any hotel listings
        const { listingsAPI } = await import('../services/api');
        const hotelsResponse = await listingsAPI.getUserListings();
        const userHotels = hotelsResponse?.results || hotelsResponse || [];

        if (userHotels.length > 0) {
          // User has hotel listings, redirect to dashboard
          navigate('/host-dashboard');
        } else {
          // User has no hotel listings, redirect to host home (onboarding page)
          // Remember intended host type so HostHomePage knows where to send the user
          try { localStorage.setItem('intendedHostType', 'hotel_restaurant'); } catch (_) {}
          navigate('/host/home');
        }
      } catch (error) {
        console.error('Error checking hotel listings:', error);
        // On error, redirect to host home as fallback
        navigate('/host/home');
      } finally {
        setIsChecking(false);
      }
    } else if (selectedType.id === 'bnb') {
      setIsChecking(true);
      try {
        const { bnbAPI } = await import('../services/api');
        const myBnB = await bnbAPI.getMyListings();
        const bnbList = myBnB?.results || myBnB || [];

        if ((bnbList?.length || 0) > 0) {
          // User already has BnB listings, go to BnB dashboard
          navigate('/host/bnb');
        } else {
          // No BnB yet → go to host home and remember intent
          try { localStorage.setItem('intendedHostType', 'bnb'); } catch (_) {}
          navigate('/host/home');
        }
      } catch (error) {
        console.error('Error checking BnB listings:', error);
        try { localStorage.setItem('intendedHostType', 'bnb'); } catch (_) {}
        navigate('/host/home');
      } finally {
        setIsChecking(false);
      }
    } else {
      // For BnB Host or other types, use the original route
      navigate(selectedType.route);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700',
        icon: 'text-blue-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        button: 'bg-green-600 hover:bg-green-700',
        icon: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700',
        icon: 'text-purple-600'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Become a Host on Msafiri Space
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose how you'd like to host and start earning from your hospitality business. 
              Whether you run a hotel, own a property, or offer services, we have the perfect platform for you.
            </p>
          </motion.div>
        </div>

        {/* Host Type Selection */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {hostTypes.map((type, index) => {
            const IconComponent = type.icon;
            const colorClasses = getColorClasses(type.color);
            const isSelected = selectedType?.id === type.id;
            
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'ring-2 ring-primary-500 shadow-lg scale-105' 
                    : 'hover:shadow-lg hover:scale-105'
                }`}
                onClick={() => handleTypeSelection(type)}
              >
                <div className={`bg-white rounded-2xl p-8 border-2 ${
                  isSelected ? 'border-primary-500' : 'border-gray-200'
                } transition-all duration-300`}>
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 ${colorClasses.bg} rounded-xl flex items-center justify-center mb-6`}>
                    <IconComponent className={`w-8 h-8 ${colorClasses.icon}`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {type.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {type.description}
                  </p>
                  
                  {/* Features */}
                  <ul className="space-y-3">
                    {type.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + featureIndex * 0.05 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckIcon className={`w-5 h-5 ${colorClasses.icon} mt-0.5 flex-shrink-0`} />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={handleContinue}
            disabled={!selectedType || isChecking}
            className={`inline-flex items-center px-8 py-4 text-lg font-semibold text-white rounded-xl transition-all duration-300 ${
              selectedType && !isChecking
                ? 'bg-primary-500 hover:bg-primary-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isChecking ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke니="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
্গ </>
            ) : (
              <>
                Continue to Setup
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 bg-white rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Host with Msafiri Space?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Earn More</h3>
              <p className="text-gray-600">
                Competitive commission rates and direct booking options to maximize your revenue.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Platform</h3>
              <p className="text-gray-600">
                Built-in payment protection and guest verification for peace of mind.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Grow Your Business</h3>
              <p className="text-gray-600">
                Marketing tools and analytics to help you reach more customers and grow.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8"
        >
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-primary-500 transition-colors duration-200"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default BecomeHostPage;
