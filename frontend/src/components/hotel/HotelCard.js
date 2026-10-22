import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `KSh ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const HotelCard = ({
  hotel,
  className = '',
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
}) => {
  const ratingRaw = hotel?.average_rating ?? hotel?.star_rating;
  const rating = ratingRaw == null || Number.isNaN(Number(ratingRaw)) ? null : Number(ratingRaw);
  const priceLabel = formatPrice(
    hotel?.starting_price ?? hotel?.price_per_night ?? hotel?.min_price
  );
  const place = [hotel.city, hotel.country].filter(Boolean).join(', ') || 'Kenya';

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`group ${className}`}
    >
      <Link to={`/hotel/${hotel.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {hotel.primary_image ? (
            <img
              src={hotel.primary_image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200" aria-hidden />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (favoriteLoading) return;
              onToggleFavorite?.(hotel.id);
            }}
            disabled={favoriteLoading}
            className="absolute top-3 right-3 p-2 text-white drop-shadow disabled:opacity-60"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <HeartSolidIcon className="w-6 h-6 text-red-500" />
            ) : (
              <HeartIcon className="w-6 h-6" />
            )}
          </button>
        </div>

        <div className="pt-2.5 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-1">{hotel.name}</h3>
            {rating !== null && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-900 flex-shrink-0">
                <StarIcon className="w-3.5 h-3.5" aria-hidden />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 line-clamp-1">{place}</p>
          <p className="text-sm text-gray-900 pt-0.5">
            {priceLabel ? (
              <>
                <span className="font-semibold">{priceLabel}</span>
                <span className="text-gray-500 font-normal"> / night</span>
              </>
            ) : (
              <span className="text-gray-500">Price on request</span>
            )}
          </p>
        </div>
      </Link>
    </motion.article>
  );
};

export default HotelCard;
