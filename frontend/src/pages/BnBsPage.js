import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { bnbAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import BnBCard from '../components/bnb/BnBCard';
import { useFavorites } from '../contexts/FavoritesContext';

const DEFAULT_FILTERS = {
  city: '',
  property_type: '',
};

const propertyTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cottage', label: 'Cottage' },
];

const BnBsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { isBnBFavorite, isBnBFavoriteBusy, toggleBnBFavorite } = useFavorites();

  useEffect(() => {
    const fetchBnBs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await bnbAPI.getListings();
        const data = response?.results || response || [];
        setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load BnB listings:', err);
        setError('Failed to load BnB listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBnBs();
  }, []);

  const handleToggleFavorite = async (listingId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/bnbs' } } });
      return;
    }
    const result = await toggleBnBFavorite(listingId);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        !searchQuery ||
        listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity =
        !filters.city ||
        listing.city?.toLowerCase().includes(filters.city.toLowerCase());

      const matchesType =
        !filters.property_type ||
        listing.property_type === filters.property_type;

      return matchesSearch && matchesCity && matchesType;
    });
  }, [listings, searchQuery, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BnB stays...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <HomeModernIcon className="w-12 h-12 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <HomeModernIcon className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">BnB Stays</h1>
          </div>
          <p className="text-lg text-gray-600">
            Unique homes, cozy apartments, and local stays across East Africa
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <form className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stays, cities, or experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              />
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                placeholder="Enter city"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={filters.property_type}
                onChange={(e) => handleFilterChange('property_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center justify-center space-x-2"
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-4"
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredListings.length} stays found
            </h2>
            {searchQuery && (
              <p className="text-gray-600">
                Showing results for “{searchQuery}”
              </p>
            )}
          </div>
        </motion.div>

        {filteredListings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <HomeModernIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stays match your filters</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or clearing the filters to see more options.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredListings.map((listing) => (
              <BnBCard
                key={listing.id}
                listing={listing}
                isFavorite={isBnBFavorite(listing.id)}
                favoriteLoading={isBnBFavoriteBusy(listing.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BnBsPage;
