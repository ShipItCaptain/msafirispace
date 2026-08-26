import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPinIcon, HeartIcon, StarIcon } from '@heroicons/react/24/outline';

const HotelCard = ({
  hotel,
  className = '',
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
}) => {
  const getRating = () => {
    const raw = hotel?.average_rating ?? hotel?.star_rating;
    if (raw === null || raw === undefined) return null;
    const num = Number(raw);
    if (Number.isNaN(num)) return null;
    return num;
  };

  const rating = getRating();

  const getPriceLabel = () => {
    const value =
      hotel?.starting_price ??
      hotel?.price_per_night ??
      hotel?.min_price ??
      null;
    if (value === null || value === undefined) return null;
    try {
      return `KES ${Number(value).toLocaleString()}`;
    } catch {
      return `KES ${value}`;
    }
  };

  const priceLabel = getPriceLabel();

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
      className={`group bg-transparent rounded-3xl transition-all duration-300 ${className}`}
    >
      <Link to={`/hotel/${hotel.id}`}>
        {/* Image */}
        <div className="relative h-64 overflow-hidden rounded-3xl shadow-md group-hover:shadow-xl bg-gray-100 transition-shadow duration-300">
          {hotel.primary_image ? (
            <img
              src={hotel.primary_image}
              alt={hotel.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">No Image</p>
              </div>
            </div>
          )}
          
          {/* Favorite heart */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (favoriteLoading) return;
              onToggleFavorite?.(hotel.id);
            }}
            disabled={favoriteLoading}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
              isFavorite
                ? 'bg-red-600 text-white'
                : 'bg-white/90 text-gray-800 hover:bg-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Info (matches BnBCard layout) */}
        <div className="px-1.5 mt-2 space-y-0.5">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-1">
            {hotel.name}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-500">
            <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="text-xs line-clamp-1">
              {hotel.city && hotel.country
                ? `${hotel.city}, ${hotel.country}`
                : hotel.full_address}
            </span>
          </div>

          {/* Price + rating in one line */}
          <div className="flex items-center flex-wrap gap-1 text-[13px] text-gray-700 pt-1">
            {priceLabel && (
              <>
                <span className="font-semibold text-gray-900">
                  {priceLabel}
                </span>
                <span className="text-gray-500">per night</span>
              </>
            )}
            {rating !== null && (
              <>
                <span className="text-gray-400">•</span>
                <StarIcon className="w-3.5 h-3.5 text-gray-900" />
                <span className="font-medium text-gray-900">
                  {rating.toFixed(2)}
                </span>
              </>
            )}
            {!priceLabel && (
              <span className="text-gray-500">
                {getPropertyTypeDisplay(hotel.property_type)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default HotelCard;
