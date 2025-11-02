import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPinIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { listingsAPI } from '../../services/api';

const HotelCard = ({ hotel, className = "" }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarSolidIcon
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getPropertyTypeDisplay = (propertyType) => {
    const typeMap = {
      'hotel': 'Hotel',
      'resort': 'Resort',
      'boutique_hotel': 'Boutique Hotel',
      'business_hotel': 'Business Hotel',
      'luxury_hotel': 'Luxury Hotel',
      'budget_hotel': 'Budget Hotel',
      'bed_and_breakfast': 'Bed & Breakfast',
      'hostel': 'Hostel',
      'apartment': 'Apartment',
      'villa': 'Villa'
    };
    return typeMap[propertyType] || propertyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${className}`}
    >
      <Link to={`/hotel/${hotel.id}`}>
        {/* Hotel Image */}
        <div className="relative h-48 overflow-hidden">
          {hotel.primary_image ? (
            <img
              src={hotel.primary_image}
              alt={hotel.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">No Image</p>
              </div>
            </div>
          )}
          
          {/* Favorite Button */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (savingFavorite) return;
              try {
                setSavingFavorite(true);
                if (!isFavorite) {
                  await listingsAPI.addFavorite(hotel.id);
                  setIsFavorite(true);
                } else {
                  await listingsAPI.removeFavorite(hotel.id);
                  setIsFavorite(false);
                }
              } catch (_) {
                // no-op
              } finally {
                setSavingFavorite(false);
              }
            }}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
              isFavorite ? 'bg-red-600 text-white' : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon className="w-5 h-5" />
          </button>

          {/* Featured Badge */}
          {hotel.is_featured && (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
              Featured
            </div>
          )}

          {/* Verified Badge */}
          {hotel.is_verified && (
            <div className="absolute bottom-3 right-3 bg-green-600 text-white p-1 rounded-full">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Hotel Information */}
        <div className="p-4">
          {/* Hotel Name and Rating */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {hotel.name}
            </h3>
            <div className="flex items-center space-x-1 ml-2">
              {renderStars(hotel.star_rating)}
              <span className="text-sm text-gray-600 ml-1">
                {hotel.star_rating}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center text-gray-600 mb-2">
            <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="text-sm line-clamp-1">{hotel.full_address}</span>
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {hotel.short_description}
          </p>

          {/* Property Type and Amenities */}
          <div className="flex items-center justify-between text-sm">
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {getPropertyTypeDisplay(hotel.property_type)}
            </span>
            <span className="text-gray-500">
              {hotel.amenity_count} amenities
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default HotelCard;
