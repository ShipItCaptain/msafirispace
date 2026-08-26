import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPinIcon, StarIcon, HeartIcon } from '@heroicons/react/24/outline';

const formatPrice = (value) => {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);
  } catch (_) {
    return `KES ${value}`;
  }
};

const BnBCard = ({ listing, isFavorite = false, favoriteLoading = false, onToggleFavorite }) => {
  return (
    <Link to={`/bnb/${listing.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group bg-transparent rounded-3xl transition-all duration-300 cursor-pointer"
      >
        {/* Image */}
        <div className="relative h-64 bg-gray-100 flex items-center justify-center rounded-3xl shadow-md group-hover:shadow-xl overflow-hidden transition-shadow duration-300">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (favoriteLoading) return;
              onToggleFavorite?.(listing.id);
            }}
            disabled={favoriteLoading}
            className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-sm transition-all ${
              isFavorite ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-800 hover:bg-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon className="w-5 h-5" />
          </button>
          {Array.isArray(listing.images) && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="text-center px-6">
              <div className="w-16 h-16 bg-gray-200 rounded-xl mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Beautiful stay waiting for you</p>
            </div>
          )}
        </div>

        {/* Info (mirrors HotelCard layout) */}
        <div className="px-1.5 mt-2 space-y-0.5">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-1">
            {listing.title}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-500">
            <MapPinIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="text-xs line-clamp-1">
              {[listing.address, listing.city, listing.country].filter(Boolean).join(', ')}
            </span>
          </div>

          {/* Price + rating in one line */}
          <div className="flex items-center flex-wrap gap-1 text-[13px] text-gray-700 pt-1">
            <span className="font-semibold text-gray-900">
              {formatPrice(Number(listing.price_per_night))}
            </span>
            <span className="text-gray-500">per night</span>
            {listing.rating !== null &&
              listing.rating !== undefined &&
              !Number.isNaN(Number(listing.rating)) && (
                <>
                  <span className="text-gray-400">•</span>
                  <StarIcon className="w-3.5 h-3.5 text-gray-900" />
                  <span className="font-medium text-gray-900">
                    {Number(listing.rating).toFixed(2)}
                  </span>
                </>
              )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default BnBCard;
